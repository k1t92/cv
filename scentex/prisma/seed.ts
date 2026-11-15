/**
 * Seeds a DEMO market: real brand/fragrance names, synthetic prices.
 * Retailers are created with sourceKind = DEMO, which the UI surfaces on every page.
 * The backfill uses the same simulator as the demo adapter and the same change-detection
 * rules as the live ingest pipeline, so seeded history and later ticks are consistent.
 */
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/db";
import { DEMO_BRANDS, DEMO_PRODUCTS, DEMO_RETAILERS, demoListingTitle, demoProductSlug, slugify } from "../src/engine/demo/catalog";
import { carries, simulate, utcDayOf } from "../src/engine/demo/generator";
import { matchProduct, type MatchCandidate } from "../src/engine/matching";
import { recomputeProductStats } from "../src/engine/stats";
import { CONCENTRATION_LONG } from "../src/lib/format";

async function chunked<T>(rows: T[], size: number, write: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) await write(rows.slice(i, i + size));
}

async function main() {
  const now = new Date();
  console.log("Clearing existing data…");
  await prisma.$transaction([
    prisma.notification.deleteMany(), prisma.priceAlert.deleteMany(), prisma.watchlistItem.deleteMany(),
    prisma.deal.deleteMany(), prisma.productStats.deleteMany(), prisma.priceChange.deleteMany(),
    prisma.priceSnapshot.deleteMany(), prisma.scraperJob.deleteMany(), prisma.retailerProduct.deleteMany(),
    prisma.product.deleteMany(), prisma.retailer.deleteMany(), prisma.brand.deleteMany(),
  ]);

  const brandIds = new Map<string, string>();
  for (const brand of DEMO_BRANDS) {
    const row = await prisma.brand.create({ data: { name: brand.name, slug: slugify(brand.name), country: brand.country } });
    brandIds.set(brand.name, row.id);
  }

  const candidates: MatchCandidate[] = [];
  for (const product of DEMO_PRODUCTS) {
    const row = await prisma.product.create({
      data: {
        slug: demoProductSlug(product),
        brandId: brandIds.get(product.brand)!,
        name: product.name,
        concentration: product.concentration,
        volumeMl: product.volumeMl,
        category: product.category,
        releaseYear: product.releaseYear,
        featuredRank: product.featuredRank,
        description: `${product.brand} ${product.name} ${CONCENTRATION_LONG[product.concentration]}, ${product.volumeMl} ml.`,
      },
    });
    candidates.push({ id: row.id, ean: null, brandName: product.brand, name: product.name, concentration: product.concentration, volumeMl: product.volumeMl });
  }

  const today = utcDayOf(now);
  const offers: Prisma.RetailerProductCreateManyInput[] = [];
  const snapshots: Prisma.PriceSnapshotCreateManyInput[] = [];
  const changes: Prisma.PriceChangeCreateManyInput[] = [];
  const jobs: Prisma.ScraperJobCreateManyInput[] = [];

  for (const retailer of DEMO_RETAILERS) {
    const row = await prisma.retailer.create({
      data: {
        slug: retailer.slug, name: retailer.name, country: retailer.country, currency: retailer.currency,
        websiteUrl: retailer.websiteUrl, sourceKind: "DEMO", adapterKey: "demo", lastRunAt: now,
      },
    });
    let seen = 0;
    for (const product of DEMO_PRODUCTS) {
      if (!carries(product, retailer)) continue;
      const states = simulate(product, retailer, today).filter((s) => s.checkAt <= now);
      const last = states.at(-1);
      if (!last) continue;

      // Listings are linked through the real matcher, exactly like a live adapter run.
      const title = demoListingTitle(product);
      const match = matchProduct({ title, brand: product.brand }, candidates);
      if (!match.productId) throw new Error(`Demo listing failed to match: ${title}`);

      const id = randomUUID();
      let lastChangedAt = states[0]!.checkAt;
      states.forEach((state, i) => {
        snapshots.push({
          retailerProductId: id, priceMinor: state.priceMinor, originalPriceMinor: state.originalPriceMinor,
          availability: state.availability, checkedAt: state.checkAt,
        });
        const prev = states[i - 1];
        if (!prev) return;
        if (prev.priceMinor !== state.priceMinor) {
          changes.push({
            retailerProductId: id, productId: match.productId, currency: retailer.currency,
            oldPriceMinor: prev.priceMinor, newPriceMinor: state.priceMinor, deltaMinor: state.priceMinor - prev.priceMinor,
            pctChange: ((state.priceMinor - prev.priceMinor) / prev.priceMinor) * 100, detectedAt: state.checkAt,
          });
        }
        if (prev.priceMinor !== state.priceMinor || prev.availability !== state.availability || prev.originalPriceMinor !== state.originalPriceMinor) {
          lastChangedAt = state.checkAt;
        }
      });
      offers.push({
        id, retailerId: row.id, productId: match.productId, externalId: `demo-${demoProductSlug(product)}`,
        rawTitle: title, rawBrand: product.brand, url: retailer.websiteUrl, matchStatus: match.status,
        matchConfidence: match.confidence, currency: retailer.currency, priceMinor: last.priceMinor,
        originalPriceMinor: last.originalPriceMinor, shippingMinor: retailer.shippingMinor,
        availability: last.availability, lastCheckedAt: last.checkAt, lastChangedAt,
      });
      seen++;
    }
    jobs.push({ retailerId: row.id, status: "SUCCEEDED", startedAt: now, finishedAt: now, offersSeen: seen, offersChanged: seen });
  }

  console.log(`Writing ${offers.length} offers, ${snapshots.length} snapshots, ${changes.length} price changes…`);
  await prisma.retailerProduct.createMany({ data: offers });
  await chunked(snapshots, 5000, (data) => prisma.priceSnapshot.createMany({ data }));
  await chunked(changes, 5000, (data) => prisma.priceChange.createMany({ data }));
  await prisma.scraperJob.createMany({ data: jobs });

  console.log("Computing product stats…");
  for (const candidate of candidates) await recomputeProductStats(prisma, candidate.id, now);
  console.log(`Seeded ${DEMO_BRANDS.length} brands, ${candidates.length} products, ${DEMO_RETAILERS.length} DEMO retailers.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
