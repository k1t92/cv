import type { PrismaClient } from "@prisma/client";
import { discountPct, eurPlnRate, pctChange, toBaseMinor } from "@/lib/money";

const DAY = 86_400_000;

/**
 * Recompute the denormalised market aggregates for one product (base currency).
 * "Lowest" always means the lowest *in-stock* price among matched offers.
 */
export async function recomputeProductStats(prisma: PrismaClient, productId: string, now: Date): Promise<void> {
  const rate = eurPlnRate();
  const offers = await prisma.retailerProduct.findMany({
    where: { productId, matchStatus: { in: ["AUTO_EAN", "AUTO_ATTRIBUTES", "MANUAL"] } },
  });
  const inStock = offers.filter((o) => o.availability === "IN_STOCK");
  const prices = inStock.map((o) => ({ id: o.retailerId, base: toBaseMinor(o.priceMinor, o.currency, rate) }));
  prices.sort((a, b) => a.base - b.base);
  const lowest = prices[0]?.base ?? null;

  const lowestAt = async (at: Date): Promise<number | null> => {
    const values = await Promise.all(
      offers.map(async (o) => {
        const snap = await prisma.priceSnapshot.findFirst({
          where: { retailerProductId: o.id, checkedAt: { lte: at } },
          orderBy: { checkedAt: "desc" },
        });
        return snap && snap.availability === "IN_STOCK" ? toBaseMinor(snap.priceMinor, o.currency, rate) : null;
      }),
    );
    const present = values.filter((v): v is number => v != null);
    return present.length ? Math.min(...present) : null;
  };

  const windowLow = async (since: Date | null): Promise<number | null> => {
    if (!offers.length) return null;
    const rows = await prisma.priceSnapshot.groupBy({
      by: ["retailerProductId"],
      where: {
        retailerProductId: { in: offers.map((o) => o.id) },
        availability: "IN_STOCK",
        ...(since ? { checkedAt: { gte: since } } : {}),
      },
      _min: { priceMinor: true },
    });
    const byId = new Map(offers.map((o) => [o.id, o]));
    const values = rows
      .filter((r) => r._min.priceMinor != null)
      .map((r) => toBaseMinor(r._min.priceMinor!, byId.get(r.retailerProductId)!.currency, rate));
    return values.length ? Math.min(...values) : null;
  };

  const [d1, d7, d30, low30Window, lowAll] = await Promise.all([
    lowestAt(new Date(now.getTime() - DAY)),
    lowestAt(new Date(now.getTime() - 7 * DAY)),
    lowestAt(new Date(now.getTime() - 30 * DAY)),
    windowLow(new Date(now.getTime() - 30 * DAY)),
    windowLow(null),
  ]);
  const low30 = [low30Window, d30].filter((v): v is number => v != null);
  const low30d = low30.length ? Math.min(...low30) : null;

  // A "new low" must be a fresh event: at/below the window minimum AND below last week's price.
  const fresh = lowest != null && d7 != null && lowest < d7;
  const claimed = inStock.map((o) => discountPct(o.priceMinor, o.originalPriceMinor)).filter((v): v is number => v != null);
  const lastChecked = offers.reduce<Date | null>((acc, o) => (!acc || o.lastCheckedAt > acc ? o.lastCheckedAt : acc), null);

  const data = {
    offersCount: offers.length,
    inStockCount: inStock.length,
    lowestMinor: lowest,
    avgMinor: prices.length ? Math.round(prices.reduce((s, p) => s + p.base, 0) / prices.length) : null,
    highestMinor: prices.length ? prices[prices.length - 1]!.base : null,
    cheapestRetailerId: prices[0]?.id ?? null,
    change24hPct: pctChange(d1, lowest),
    change7dPct: pctChange(d7, lowest),
    change30dPct: pctChange(d30, lowest),
    low30dMinor: low30d,
    lowAllTimeMinor: lowAll,
    isLow30d: fresh && low30d != null && lowest! <= low30d,
    isAllTimeLow: fresh && lowAll != null && lowest! <= lowAll,
    maxClaimedDiscount: claimed.length ? Math.max(...claimed) : null,
    lastCheckedAt: lastChecked,
  };
  await prisma.productStats.upsert({ where: { productId }, create: { productId, ...data }, update: data });
}
