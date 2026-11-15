import type { PrismaClient, Retailer } from "@prisma/client";
import { matchProduct, type MatchCandidate } from "./matching";
import { recomputeProductStats } from "./stats";
import { computeTransition, isPlausibleMove } from "./transition";
import { rawOfferSchema, type RawOffer, type RetailerAdapter } from "./types";

export interface RunSummary {
  retailer: string;
  status: "SUCCEEDED" | "PARTIAL" | "FAILED";
  offersSeen: number;
  offersChanged: number;
  offersRejected: number;
  unmatched: number;
  error?: string;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 500): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
    }
  }
  throw lastError;
}

/**
 * Run one adapter end to end:
 * fetch (with retry) -> validate -> dedupe -> match -> detect change -> store -> recompute stats.
 * Every run leaves a ScraperJob row, including failed ones.
 */
export async function runAdapter(prisma: PrismaClient, retailer: Retailer, adapter: RetailerAdapter, now = new Date()): Promise<RunSummary> {
  const job = await prisma.scraperJob.create({ data: { retailerId: retailer.id, status: "RUNNING", startedAt: now } });
  const summary: RunSummary = { retailer: retailer.slug, status: "SUCCEEDED", offersSeen: 0, offersChanged: 0, offersRejected: 0, unmatched: 0 };

  try {
    const fetched = await withRetry(() => adapter.fetchOffers(retailer, { now }));

    // Validate + dedupe (last listing wins for a repeated externalId).
    const valid = new Map<string, RawOffer>();
    for (const item of fetched) {
      const parsed = rawOfferSchema.safeParse(item);
      if (parsed.success) valid.set(parsed.data.externalId, parsed.data);
      else summary.offersRejected++;
    }

    const products = await prisma.product.findMany({ include: { brand: true } });
    const candidates: MatchCandidate[] = products.map((p) => ({
      id: p.id, ean: p.ean, brandName: p.brand.name, name: p.name, concentration: p.concentration, volumeMl: p.volumeMl,
    }));
    const affected = new Set<string>();

    for (const offer of valid.values()) {
      summary.offersSeen++;
      const existing = await prisma.retailerProduct.findUnique({
        where: { retailerId_externalId: { retailerId: retailer.id, externalId: offer.externalId } },
      });
      const state = {
        priceMinor: offer.priceMinor,
        originalPriceMinor: offer.originalPriceMinor ?? null,
        shippingMinor: offer.shippingMinor ?? null,
        availability: offer.availability,
        lastCheckedAt: now,
      };
      const snapshot = {
        priceMinor: offer.priceMinor,
        originalPriceMinor: offer.originalPriceMinor ?? null,
        availability: offer.availability,
        checkedAt: now,
      };

      if (!existing) {
        const match = matchProduct(offer, candidates);
        if (!match.productId) summary.unmatched++;
        await prisma.retailerProduct.create({
          data: {
            ...state,
            retailerId: retailer.id,
            productId: match.productId,
            externalId: offer.externalId,
            rawTitle: offer.title,
            rawBrand: offer.brand,
            ean: offer.ean,
            url: offer.url,
            imageUrl: offer.imageUrl,
            currency: offer.currency,
            matchStatus: match.status,
            matchConfidence: match.confidence,
            lastChangedAt: now,
            snapshots: { create: snapshot },
          },
        });
        summary.offersChanged++;
        if (match.productId) affected.add(match.productId);
        continue;
      }

      if (existing.currency !== offer.currency || !isPlausibleMove(existing.priceMinor, offer.priceMinor)) {
        // Quarantine: likely a parsing error or a mis-keyed price. Keep the old state.
        summary.offersRejected++;
        console.warn(`[ingest] ${retailer.slug}/${offer.externalId}: implausible ${existing.priceMinor} -> ${offer.priceMinor} ${offer.currency}, skipped`);
        continue;
      }

      const transition = computeTransition(existing, offer, now);
      await prisma.$transaction([
        prisma.retailerProduct.update({
          where: { id: existing.id },
          data: { ...state, url: offer.url, rawTitle: offer.title, ...(transition.stateChanged ? { lastChangedAt: now } : {}) },
        }),
        ...(transition.writeSnapshot ? [prisma.priceSnapshot.create({ data: { ...snapshot, retailerProductId: existing.id } })] : []),
        ...(transition.priceChange
          ? [prisma.priceChange.create({
              data: { ...transition.priceChange, retailerProductId: existing.id, productId: existing.productId, currency: existing.currency, detectedAt: now },
            })]
          : []),
      ]);
      if (transition.stateChanged) summary.offersChanged++;
      if (existing.productId) affected.add(existing.productId);
    }

    for (const productId of affected) await recomputeProductStats(prisma, productId, now);
    if (summary.offersRejected > 0) summary.status = "PARTIAL";
  } catch (error) {
    summary.status = "FAILED";
    summary.error = error instanceof Error ? error.message : String(error);
    console.error(`[ingest] ${retailer.slug} failed:`, error);
  }

  await prisma.$transaction([
    prisma.scraperJob.update({
      where: { id: job.id },
      data: {
        status: summary.status, finishedAt: new Date(), offersSeen: summary.offersSeen, offersChanged: summary.offersChanged,
        offersRejected: summary.offersRejected, unmatched: summary.unmatched, errorMessage: summary.error,
      },
    }),
    prisma.retailer.update({ where: { id: retailer.id }, data: { lastRunAt: now } }),
  ]);
  return summary;
}
