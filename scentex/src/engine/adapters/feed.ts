import { fetchFeed } from "../feeds/fetch";
import { mapRecord, type MappingContext } from "../feeds/mapping";
import { parseFeed } from "../feeds/parse";
import { getPreset } from "../feeds/presets";
import type { RawOffer, RetailerAdapter } from "../types";

interface FeedOptions {
  includePattern?: string;
  excludePattern?: string;
  recordPath?: string;
  fields?: MappingContext["fields"];
}

/**
 * Generic feed adapter: any retailer whose data arrives as a CSV / XML / JSON product feed
 * is connected through configuration (Retailer.feedUrl + feedPreset), not new code.
 */
export const feedAdapter: RetailerAdapter = {
  key: "feed",
  async fetchOffers(retailer) {
    if (!retailer.feedUrl) throw new Error("Source has no feed URL configured");
    const preset = getPreset(retailer.feedPreset);
    if (!preset) throw new Error(`Unknown feed preset "${retailer.feedPreset ?? ""}"`);
    const options = (retailer.feedOptions ?? {}) as FeedOptions;

    let authHeader: string | undefined;
    if (retailer.authHeaderEnv) {
      authHeader = process.env[retailer.authHeaderEnv];
      if (!authHeader) throw new Error(`Environment variable ${retailer.authHeaderEnv} is not set`);
    }

    const text = await fetchFeed(retailer.feedUrl, { authHeader });
    const records = parseFeed(text, retailer.feedFormat ?? preset.format, {
      recordPath: options.recordPath ?? preset.recordPath,
      explode: preset.explode,
    });
    if (records.length === 0) throw new Error("Feed contained no records");

    const context: MappingContext = {
      websiteUrl: retailer.websiteUrl, currency: retailer.currency,
      includePattern: options.includePattern, excludePattern: options.excludePattern, fields: options.fields,
    };
    const offers: RawOffer[] = [];
    for (const record of records) {
      const result = mapRecord(record, preset, context);
      // Unvalidated on purpose: ingest applies the schema and reports rejects.
      if ("offer" in result) offers.push(result.offer as RawOffer);
    }
    return offers;
  },
};
