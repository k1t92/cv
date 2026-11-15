import type { Retailer } from "@prisma/client";
import { z } from "zod";

/**
 * The standard shape every retailer adapter must return.
 * Adapters do the fetching and source-specific parsing; everything downstream
 * (validation, matching, change detection, storage) is shared.
 */
/** Only web links: a feed must not be able to plant javascript:, data: or file: URLs in our pages. */
const webUrl = z.string().max(2000).url().refine((value) => /^https?:\/\//i.test(value), "must be an http(s) URL");

export const rawOfferSchema = z.object({
  externalId: z.string().min(1).max(200),
  title: z.string().min(3).max(500),
  brand: z.string().min(1).max(120).optional(),
  ean: z.string().regex(/^\d{8,14}$/).optional(),
  volumeMl: z.number().int().positive().max(2000).optional(),
  concentration: z.enum(["EDC", "EDT", "EDP", "PARFUM", "EXTRAIT", "OTHER"]).optional(),
  priceMinor: z.number().int().positive(),
  originalPriceMinor: z.number().int().positive().optional(),
  currency: z.enum(["PLN", "EUR"]),
  availability: z.enum(["IN_STOCK", "OUT_OF_STOCK", "UNKNOWN"]),
  url: webUrl,
  imageUrl: webUrl.optional(),
  shippingMinor: z.number().int().nonnegative().optional(),
});

export type RawOffer = z.infer<typeof rawOfferSchema>;

export interface AdapterContext {
  now: Date;
}

export interface RetailerAdapter {
  /** Matches Retailer.adapterKey. */
  key: string;
  fetchOffers(retailer: Retailer, ctx: AdapterContext): Promise<RawOffer[]>;
}
