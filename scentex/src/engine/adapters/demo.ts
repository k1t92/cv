import { DEMO_PRODUCTS, DEMO_RETAILERS, demoListingTitle, demoProductSlug } from "../demo/catalog";
import { carries, simulate, utcDayOf } from "../demo/generator";
import type { RawOffer, RetailerAdapter } from "../types";

/**
 * DemoAdapter: emits synthetic offers in the standard adapter shape so the whole
 * pipeline (validation, matching, change detection, storage, stats) runs for real.
 * A production adapter replaces only this file's fetching/parsing.
 */
export const demoAdapter: RetailerAdapter = {
  key: "demo",
  async fetchOffers(retailer, ctx) {
    const config = DEMO_RETAILERS.find((r) => r.slug === retailer.slug);
    if (!config) throw new Error(`No demo configuration for retailer "${retailer.slug}"`);
    const today = utcDayOf(ctx.now);
    const offers: RawOffer[] = [];
    for (const product of DEMO_PRODUCTS) {
      if (!carries(product, config)) continue;
      const state = simulate(product, config, today).at(-1);
      if (!state) continue;
      offers.push({
        externalId: `demo-${demoProductSlug(product)}`,
        title: demoListingTitle(product),
        brand: product.brand,
        priceMinor: state.priceMinor,
        originalPriceMinor: state.originalPriceMinor ?? undefined,
        currency: config.currency,
        availability: state.availability,
        // Demo offers link to the store's home page: there is no real listing behind them.
        url: config.websiteUrl,
        shippingMinor: config.shippingMinor,
      });
    }
    return offers;
  },
};
