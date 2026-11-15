import type { Concentration, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { convertMinor, eurPlnRate, type CurrencyCode } from "./money";
import { rangeStart, type RangeKey } from "./ranges";
import { clip, compress, lowestAcross, seriesStats, type Observation, type SeriesStats } from "./series";

const MATCHED = ["AUTO_EAN", "AUTO_ATTRIBUTES", "MANUAL"] as const;
const statsInclude = { product: { include: { brand: true } }, cheapestRetailer: true } satisfies Prisma.ProductStatsInclude;
export type StatsRow = Prisma.ProductStatsGetPayload<{ include: typeof statsInclude }>;

export async function getMarketSummary() {
  const [products, retailers, demoRetailers, discounts, newLows, latest] = await Promise.all([
    prisma.product.count(),
    prisma.retailer.count({ where: { enabled: true } }),
    prisma.retailer.count({ where: { enabled: true, sourceKind: "DEMO" } }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM "RetailerProduct"
      WHERE "productId" IS NOT NULL AND "availability" = 'IN_STOCK' AND "originalPriceMinor" > "priceMinor"`,
    prisma.productStats.count({ where: { isLow30d: true } }),
    prisma.retailer.aggregate({ _max: { lastRunAt: true } }),
  ]);
  return {
    products, retailers, demoRetailers,
    discounts: Number(discounts[0]?.count ?? 0),
    newLows,
    lastUpdate: latest._max.lastRunAt,
  };
}

export async function hasDemoData(): Promise<boolean> {
  return (await prisma.retailer.count({ where: { sourceKind: "DEMO", enabled: true } })) > 0;
}

export function getMovers(kind: "fallers" | "risers", take = 5): Promise<StatsRow[]> {
  return prisma.productStats.findMany({
    where: { change24hPct: kind === "fallers" ? { lt: 0 } : { gt: 0 } },
    orderBy: { change24hPct: kind === "fallers" ? "asc" : "desc" },
    take, include: statsInclude,
  });
}

export function getNewLows(take = 5): Promise<StatsRow[]> {
  return prisma.productStats.findMany({
    where: { isLow30d: true, lowestMinor: { not: null } },
    orderBy: [{ isAllTimeLow: "desc" }, { change30dPct: "asc" }],
    take, include: statsInclude,
  });
}

export function getFeatured(take = 6): Promise<StatsRow[]> {
  return prisma.productStats.findMany({
    where: { product: { featuredRank: { not: null } } },
    orderBy: { product: { featuredRank: "asc" } },
    take, include: statsInclude,
  });
}

export function getRecentChanges(take = 8) {
  return prisma.priceChange.findMany({
    where: { productId: { not: null } },
    orderBy: { detectedAt: "desc" },
    take,
    include: { product: { include: { brand: true } }, retailerProduct: { include: { retailer: true } } },
  });
}

export interface BrandMove { slug: string; name: string; products: number; avg7d: number | null }

export async function getBrandMoves(take = 6): Promise<BrandMove[]> {
  const rows = await prisma.$queryRaw<{ slug: string; name: string; products: bigint; avg7d: number | null }[]>`
    SELECT b."slug", b."name", count(p."id") AS products, avg(s."change7dPct") AS avg7d
    FROM "Brand" b
    JOIN "Product" p ON p."brandId" = b."id"
    JOIN "ProductStats" s ON s."productId" = p."id"
    GROUP BY b."id"
    ORDER BY abs(coalesce(avg(s."change7dPct"), 0)) DESC
    LIMIT ${take}`;
  return rows.map((r) => ({ ...r, products: Number(r.products) }));
}

export function listBrands() {
  return prisma.brand.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } });
}

// ---- Market list (shared by the market-watch table and the catalogue) ----

export const SORT_KEYS = ["name", "brand", "conc", "volume", "low", "avg", "high", "d1", "d7", "d30", "retailer"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const CONCENTRATIONS: Concentration[] = ["EDC", "EDT", "EDP", "PARFUM", "EXTRAIT"];

export interface MarketQuery {
  q: string;
  brand: string;
  conc: Concentration | "";
  sort: SortKey;
  dir: "asc" | "desc";
  page: number;
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseMarketQuery(search: Search, defaults: Partial<MarketQuery> = {}): MarketQuery {
  const sort = one(search.sort) as SortKey;
  const conc = one(search.conc).toUpperCase() as Concentration;
  const page = Number.parseInt(one(search.page), 10);
  return {
    q: one(search.q).trim().slice(0, 80),
    brand: one(search.brand).slice(0, 80),
    conc: CONCENTRATIONS.includes(conc) ? conc : "",
    sort: SORT_KEYS.includes(sort) ? sort : defaults.sort ?? "d1",
    dir: one(search.dir) === "desc" ? "desc" : one(search.dir) === "asc" ? "asc" : defaults.dir ?? "asc",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function marketHref(base: string, query: MarketQuery, patch: Partial<MarketQuery> = {}, hash = ""): string {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.brand) params.set("brand", next.brand);
  if (next.conc) params.set("conc", next.conc);
  params.set("sort", next.sort);
  params.set("dir", next.dir);
  if (next.page > 1) params.set("page", String(next.page));
  return `${base}?${params.toString()}${hash}`;
}

function orderBy(sort: SortKey, dir: "asc" | "desc"): Prisma.ProductStatsOrderByWithRelationInput[] {
  const nullable = (field: "lowestMinor" | "avgMinor" | "highestMinor" | "change24hPct" | "change7dPct" | "change30dPct") =>
    ({ [field]: { sort: dir, nulls: "last" } }) as Prisma.ProductStatsOrderByWithRelationInput;
  const tie: Prisma.ProductStatsOrderByWithRelationInput = { product: { slug: "asc" } };
  switch (sort) {
    case "name": return [{ product: { name: dir } }, tie];
    case "brand": return [{ product: { brand: { name: dir } } }, tie];
    case "conc": return [{ product: { concentration: dir } }, tie];
    case "volume": return [{ product: { volumeMl: dir } }, tie];
    case "low": return [nullable("lowestMinor"), tie];
    case "avg": return [nullable("avgMinor"), tie];
    case "high": return [nullable("highestMinor"), tie];
    case "d1": return [nullable("change24hPct"), tie];
    case "d7": return [nullable("change7dPct"), tie];
    case "d30": return [nullable("change30dPct"), tie];
    case "retailer": return [{ cheapestRetailer: { name: dir } }, tie];
  }
}

export async function listMarket(query: MarketQuery, pageSize: number) {
  const product: Prisma.ProductWhereInput = {
    ...(query.brand ? { brand: { slug: query.brand } } : {}),
    ...(query.conc ? { concentration: query.conc } : {}),
    ...(query.q
      ? { AND: query.q.split(/\s+/).map((term) => ({
          OR: [{ name: { contains: term, mode: "insensitive" as const } }, { brand: { name: { contains: term, mode: "insensitive" as const } } }],
        })) }
      : {}),
  };
  const where: Prisma.ProductStatsWhereInput = { product };
  const total = await prisma.productStats.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(query.page, pages);
  const rows = await prisma.productStats.findMany({
    where, orderBy: orderBy(query.sort, query.dir), skip: (page - 1) * pageSize, take: pageSize, include: statsInclude,
  });
  return { rows, total, page, pages };
}

// ---- Product terminal ----

export function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      stats: true,
      offers: { where: { matchStatus: { in: [...MATCHED] } }, include: { retailer: true } },
    },
  });
}

export function getPriceChanges(productId: string, take = 200) {
  return prisma.priceChange.findMany({
    where: { productId },
    orderBy: { detectedAt: "desc" },
    take,
    include: { retailerProduct: { include: { retailer: true } } },
  });
}

/** Stable colour slot per retailer, independent of which retailers a product has. */
export async function retailerColorIndex(): Promise<Map<string, number>> {
  const retailers = await prisma.retailer.findMany({ orderBy: [{ createdAt: "asc" }, { slug: "asc" }], select: { id: true } });
  return new Map(retailers.map((r, i) => [r.id, i]));
}

export interface HistoryPayload {
  range: RangeKey;
  currency: CurrencyCode;
  from: number;
  to: number;
  lowest: Observation[];
  stats: SeriesStats;
  retailers: { id: string; name: string; country: string; colorIndex: number; points: Observation[] }[];
}

export async function getHistory(slug: string, range: RangeKey, currency: CurrencyCode, now = new Date()): Promise<HistoryPayload | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { offers: { where: { matchStatus: { in: [...MATCHED] } }, select: { id: true, currency: true, retailer: true } } },
  });
  if (!product) return null;
  const start = rangeStart(range, now);
  const rate = eurPlnRate();
  const colors = await retailerColorIndex();
  const to = now.getTime();

  const retailers = await Promise.all(
    product.offers.map(async (offer) => {
      const [carry, rows] = await Promise.all([
        start
          ? prisma.priceSnapshot.findFirst({ where: { retailerProductId: offer.id, checkedAt: { lt: start } }, orderBy: { checkedAt: "desc" } })
          : null,
        prisma.priceSnapshot.findMany({
          where: { retailerProductId: offer.id, ...(start ? { checkedAt: { gte: start } } : {}) },
          orderBy: { checkedAt: "asc" },
          select: { priceMinor: true, availability: true, checkedAt: true },
        }),
      ]);
      const all = [...(carry ? [carry] : []), ...rows].map((s) => ({
        t: s.checkedAt.getTime(),
        v: s.availability === "IN_STOCK" ? convertMinor(s.priceMinor, offer.currency, currency, rate) : null,
      }));
      const first = all[0]?.t ?? to;
      const points = compress(clip(all, start ? start.getTime() : first, to));
      return { id: offer.retailer.id, name: offer.retailer.name, country: offer.retailer.country, colorIndex: colors.get(offer.retailer.id) ?? 99, points };
    }),
  );
  retailers.sort((a, b) => a.colorIndex - b.colorIndex);

  const lowest = lowestAcross(retailers.map((r) => r.points));
  const from = start ? start.getTime() : lowest[0]?.t ?? to;
  return { range, currency, from, to, lowest, stats: seriesStats(lowest, to), retailers };
}
