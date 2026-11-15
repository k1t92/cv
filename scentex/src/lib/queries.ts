import type { Concentration, DataMode, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getFx } from "./fx";
import { modeFilter } from "./mode";
import { convertMinor, type CurrencyCode } from "./money";
import { rangeStart, type RangeKey } from "./ranges";
import { clip, compress, lowestAcross, seriesStats, type Observation, type SeriesStats } from "./series";

const MATCHED = ["AUTO_EAN", "AUTO_ATTRIBUTES", "MANUAL"] as const;
const statsInclude = { product: { include: { brand: true } }, cheapestRetailer: true } satisfies Prisma.ProductStatsInclude;
export type StatsRow = Prisma.ProductStatsGetPayload<{ include: typeof statsInclude }>;

export async function getMarketSummary(mode: DataMode) {
  const kind = mode === "DEMO";
  const [products, retailers, discounts, newLows, latest] = await Promise.all([
    prisma.productStats.count({ where: { mode } }),
    prisma.retailer.count({ where: modeFilter(mode) }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM "RetailerProduct" rp JOIN "Retailer" r ON r."id" = rp."retailerId"
      WHERE rp."productId" IS NOT NULL AND rp."availability" = 'IN_STOCK' AND rp."originalPriceMinor" > rp."priceMinor"
        AND r."enabled" AND (r."sourceKind" = 'DEMO') = ${kind}`,
    prisma.productStats.count({ where: { mode, isLow30d: true } }),
    prisma.retailer.aggregate({ where: modeFilter(mode), _max: { lastRunAt: true } }),
  ]);
  return { products, retailers, discounts: Number(discounts[0]?.count ?? 0), newLows, lastUpdate: latest._max.lastRunAt };
}

/** How many enabled sources exist per mode; drives the default view and the LIVE/DEMO switch. */
export async function getSourceCounts(): Promise<{ live: number; demo: number }> {
  const [live, demo] = await Promise.all([
    prisma.retailer.count({ where: modeFilter("LIVE") }),
    prisma.retailer.count({ where: modeFilter("DEMO") }),
  ]);
  return { live, demo };
}

export function getMovers(mode: DataMode, kind: "fallers" | "risers", take = 5): Promise<StatsRow[]> {
  return prisma.productStats.findMany({
    where: { mode, change24hPct: kind === "fallers" ? { lt: 0 } : { gt: 0 } },
    orderBy: { change24hPct: kind === "fallers" ? "asc" : "desc" },
    take, include: statsInclude,
  });
}

export function getNewLows(mode: DataMode, take = 5): Promise<StatsRow[]> {
  return prisma.productStats.findMany({
    where: { mode, isLow30d: true, lowestMinor: { not: null } },
    orderBy: [{ isAllTimeLow: "desc" }, { change30dPct: "asc" }],
    take, include: statsInclude,
  });
}

export function getFeatured(mode: DataMode, take = 6): Promise<StatsRow[]> {
  return prisma.productStats.findMany({
    where: { mode, product: { featuredRank: { not: null } } },
    orderBy: { product: { featuredRank: "asc" } },
    take, include: statsInclude,
  });
}

export function getRecentChanges(mode: DataMode, take = 8) {
  return prisma.priceChange.findMany({
    where: { productId: { not: null }, retailerProduct: { retailer: modeFilter(mode) } },
    orderBy: { detectedAt: "desc" },
    take,
    include: { product: { include: { brand: true } }, retailerProduct: { include: { retailer: true } } },
  });
}

export interface BrandMove { slug: string; name: string; products: number; avg7d: number | null }

export async function getBrandMoves(mode: DataMode, take = 6): Promise<BrandMove[]> {
  const rows = await prisma.$queryRaw<{ slug: string; name: string; products: bigint; avg7d: number | null }[]>`
    SELECT b."slug", b."name", count(p."id") AS products, avg(s."change7dPct") AS avg7d
    FROM "Brand" b
    JOIN "Product" p ON p."brandId" = b."id"
    JOIN "ProductStats" s ON s."productId" = p."id" AND s."mode" = ${mode}::"DataMode"
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

export async function listMarket(query: MarketQuery, pageSize: number, mode: DataMode) {
  const product: Prisma.ProductWhereInput = {
    ...(query.brand ? { brand: { slug: query.brand } } : {}),
    ...(query.conc ? { concentration: query.conc } : {}),
    ...(query.q
      ? { AND: query.q.split(/\s+/).map((term) => ({
          OR: [{ name: { contains: term, mode: "insensitive" as const } }, { brand: { name: { contains: term, mode: "insensitive" as const } } }],
        })) }
      : {}),
  };
  const where: Prisma.ProductStatsWhereInput = { mode, product };
  const total = await prisma.productStats.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(query.page, pages);
  const rows = await prisma.productStats.findMany({
    where, orderBy: orderBy(query.sort, query.dir), skip: (page - 1) * pageSize, take: pageSize, include: statsInclude,
  });
  return { rows, total, page, pages };
}

// ---- Product terminal ----

export function getProduct(slug: string, mode: DataMode) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      stats: { where: { mode } },
      offers: { where: { matchStatus: { in: [...MATCHED] }, retailer: modeFilter(mode) }, include: { retailer: true } },
    },
  });
}

export function getPriceChanges(productId: string, mode: DataMode, take = 200) {
  return prisma.priceChange.findMany({
    where: { productId, retailerProduct: { retailer: modeFilter(mode) } },
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
  /** DEMO = synthetic prices; LIVE = observed from real sources. A response never mixes the two. */
  mode: DataMode;
  range: RangeKey;
  currency: CurrencyCode;
  from: number;
  to: number;
  lowest: Observation[];
  stats: SeriesStats;
  retailers: { id: string; name: string; country: string; colorIndex: number; points: Observation[] }[];
}

export async function getHistory(slug: string, range: RangeKey, currency: CurrencyCode, mode: DataMode, now = new Date()): Promise<HistoryPayload | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { offers: { where: { matchStatus: { in: [...MATCHED] }, retailer: modeFilter(mode) }, select: { id: true, currency: true, retailer: true } } },
  });
  if (!product) return null;
  const start = rangeStart(range, now);
  const { rate } = await getFx(prisma);
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
  return { mode, range, currency, from, to, lowest, stats: seriesStats(lowest, to), retailers };
}
