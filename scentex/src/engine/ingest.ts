import type { PrismaClient, Retailer } from "@prisma/client";
import { modeOf } from "@/lib/mode";
import { deriveLineName, matchProduct, parseTitle, type MatchCandidate } from "./matching";
import { slugify } from "./demo/catalog";
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
  offersMissing: number;
  error?: string;
}

/** Abort instead of writing when a feed suddenly shrinks: a truncated download must not wipe a catalogue. */
export const MIN_RETAINED_SHARE = 0.5;
const GUARD_MIN_PREVIOUS = 20;

export function feedShrankTooMuch(previousCount: number | null | undefined, currentCount: number): boolean {
  return previousCount != null && previousCount >= GUARD_MIN_PREVIOUS && currentCount < previousCount * MIN_RETAINED_SHARE;
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
export async function runAdapter(prisma: PrismaClient, retailer: Retailer, adapter: RetailerAdapter, now = new Date(), options: { allowNoContact?: boolean } = {}): Promise<RunSummary> {
  const job = await prisma.scraperJob.create({ data: { retailerId: retailer.id, status: "RUNNING", startedAt: now } });
  const summary: RunSummary = { retailer: retailer.slug, status: "SUCCEEDED", offersSeen: 0, offersChanged: 0, offersRejected: 0, unmatched: 0, offersMissing: 0 };
  const mode = modeOf(retailer.sourceKind);

  try {
    // Partial (page-crawling) adapters pace their own requests and must not be re-run on failure.
    const context = { now, prisma, allowNoContact: options.allowNoContact, warnings: [] as string[] };
    const fetched = adapter.partial ? await adapter.fetchOffers(retailer, context) : await withRetry(() => adapter.fetchOffers(retailer, context));

    // Validate + dedupe (last listing wins for a repeated externalId).
    const valid = new Map<string, RawOffer>();
    for (const item of fetched) {
      const parsed = rawOfferSchema.safeParse(item);
      // A source must quote in its own declared currency; anything else is a mapping error.
      if (parsed.success && parsed.data.currency === retailer.currency) valid.set(parsed.data.externalId, parsed.data);
      else summary.offersRejected++;
    }
    if (valid.size === 0 && !adapter.partial) throw new Error(`No valid offers (${fetched.length} fetched, ${summary.offersRejected} rejected)`);
    if (!adapter.partial && feedShrankTooMuch(retailer.lastOfferCount, valid.size)) {
      throw new Error(`Feed shrank from ${retailer.lastOfferCount} to ${valid.size} offers; run aborted, stored data left untouched`);
    }

    const products = await prisma.product.findMany({ include: { brand: true } });
    const candidates: MatchCandidate[] = products.map((p) => ({
      id: p.id, ean: p.ean, brandName: p.brand.name, name: p.name, concentration: p.concentration, volumeMl: p.volumeMl,
    }));
    const brands = await prisma.brand.findMany();
    const usedEans = new Set(products.map((p) => p.ean).filter(Boolean));
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
        let match = matchProduct(offer, candidates);
        if (mode === "LIVE" && offer.ean) {
          if (match.productId && match.status === "AUTO_ATTRIBUTES" && !usedEans.has(offer.ean)) {
            // Learn the barcode from an exact attribute match so the next store can match on EAN alone.
            const target = candidates.find((c) => c.id === match.productId)!;
            if (!target.ean) {
              await prisma.product.update({ where: { id: target.id }, data: { ean: offer.ean } });
              target.ean = offer.ean;
              usedEans.add(offer.ean);
            }
          } else if (!match.productId && !usedEans.has(offer.ean)) {
            // A new fragrance of a tracked brand, fully identified (barcode + concentration + volume):
            // add it to the catalogue so discovery does not depend on manual entry.
            const created = await createProductFromOffer(prisma, offer, brands);
            if (created) {
              candidates.push(created);
              usedEans.add(offer.ean);
              match = { productId: created.id, status: "AUTO_EAN", confidence: 0.85 };
            }
          }
        }
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

    // Listings that vanished from the source are no longer confirmed purchasable.
    // (Only meaningful when a run covers the whole source.)
    const missing = adapter.partial ? [] : await prisma.retailerProduct.findMany({
      where: { retailerId: retailer.id, externalId: { notIn: [...valid.keys()] }, availability: { not: "UNKNOWN" } },
      select: { id: true, productId: true, priceMinor: true, originalPriceMinor: true },
    });
    for (const gone of missing) {
      await prisma.$transaction([
        prisma.retailerProduct.update({ where: { id: gone.id }, data: { availability: "UNKNOWN", lastChangedAt: now } }),
        prisma.priceSnapshot.create({
          data: { retailerProductId: gone.id, priceMinor: gone.priceMinor, originalPriceMinor: gone.originalPriceMinor, availability: "UNKNOWN", checkedAt: now },
        }),
      ]);
      if (gone.productId) affected.add(gone.productId);
    }
    summary.offersMissing = missing.length;

    for (const productId of affected) await recomputeProductStats(prisma, productId, mode, now);
    if (summary.offersRejected > 0) summary.status = "PARTIAL";
    if (context.warnings.length) {
      summary.status = "PARTIAL";
      summary.error = context.warnings.join(" ");
    }
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
        offersRejected: summary.offersRejected, unmatched: summary.unmatched, offersMissing: summary.offersMissing,
        errorMessage: summary.error?.slice(0, 2000),
      },
    }),
    prisma.retailer.update({
      where: { id: retailer.id },
      data: {
        lastRunAt: now, lastStatus: summary.status, lastError: summary.error?.slice(0, 2000) ?? null,
        consecutiveFailures: summary.status === "FAILED" ? { increment: 1 } : 0,
        ...(summary.status === "FAILED" || adapter.partial ? {} : { lastOfferCount: summary.offersSeen }),
      },
    }),
  ]);
  return summary;
}

/**
 * Create a catalogue product from a live listing, but only when nothing has to be guessed:
 * the brand is one we track, and the listing states a barcode, a concentration and a volume.
 */
async function createProductFromOffer(prisma: PrismaClient, offer: RawOffer, brands: { id: string; name: string }[]): Promise<MatchCandidate | null> {
  const key = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const brand = offer.brand
    ? brands.find((b) => key(b.name) === key(offer.brand!))
    : [...brands].sort((a, b) => b.name.length - a.name.length).find((b) => key(offer.title).startsWith(key(b.name) + " "));
  if (!brand || !offer.ean) return null;
  const parsed = parseTitle(offer.title, brand.name);
  const name = deriveLineName(offer.title, brand.name);
  if (!parsed.concentration || !parsed.volumeMl || !name || !parsed.nameKey) return null;
  const slug = slugify(`${brand.name} ${name} ${parsed.concentration} ${parsed.volumeMl}ml`);
  try {
    const product = await prisma.product.create({
      data: { slug, brandId: brand.id, name, concentration: parsed.concentration, volumeMl: parsed.volumeMl, ean: offer.ean },
    });
    return { id: product.id, ean: product.ean, brandName: brand.name, name: product.name, concentration: product.concentration, volumeMl: product.volumeMl };
  } catch {
    // Unique collision (same line/size already catalogued under another barcode): leave it for manual review.
    return null;
  }
}
