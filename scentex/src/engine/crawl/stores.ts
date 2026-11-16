/**
 * Source profiles: what the access audit found for each store, and — only for stores where
 * public collection is permitted and verified — how to collect.
 *
 * A profile without `crawl` is a record of the audit, not an integration: there is nothing to
 * run for it, and the engine refuses to enable it.
 */
export type AccessStatusName = "PUBLIC_ACCESS_SUPPORTED" | "PARTIALLY_SUPPORTED" | "REQUIRES_PARTNERSHIP" | "RESTRICTED" | "NOT_VERIFIED";

export interface CrawlConfig {
  /** Sitemap entry points. When empty, the `Sitemap:` lines of robots.txt are used. */
  sitemapUrls?: string[];
  /** Regex a child sitemap URL must match (e.g. product sitemaps only). */
  sitemapInclude?: string;
  /** Regex on the page path: only likely fragrance product pages are ever requested. */
  urlInclude: string;
  urlExclude?: string;
  /** Regex on the extracted title: testers, unboxed stock, sets and refills are not the retail unit we track. */
  titleExclude?: string;
  /** Read variant sizes from Shopify's inline storefront data when JSON-LD offers carry no name. */
  inlineVariants?: boolean;
  /** Only request pages whose slug starts with a tracked brand. Keeps volume proportionate. */
  brandPrefixOnly: boolean;
  /** Minimum pause between two requests to this host (never below 2000 ms; robots Crawl-delay wins if larger). */
  minDelayMs: number;
  maxPagesPerRun: number;
  maxSitemapsPerRun: number;
  /** Re-check interval for pages of featured brands / all other pages. */
  recheckHours: number;
}

export interface StoreProfile {
  slug: string;
  name: string;
  country: string;
  currency: "PLN" | "EUR";
  websiteUrl: string;
  accessStatus: AccessStatusName;
  /** One-line audit finding, shown in the admin panel. */
  finding: string;
  crawl?: CrawlConfig;
}

const FRAGRANCE_PATH = "woda-perfumowana|woda-toaletowa|woda-kolonska|ekstrakt-perfum|perfumy|eau-de-parfum|eau-de-toilette|-edp-|-edt-|-parfum";
const NOT_RETAIL_UNIT = "tester|bez opakowania|bez pude[lł]ka|unboxed|uszkodzon|zestaw|refill|wk[lł]ad|uzupe[lł]nienie|miniatur|pr[oó]bka";
const NOT_SINGLE_BOTTLE = "zestaw|tester|refill|wklad|uzupelnienie|miniatur|probka|próbka|travel|dezodorant|deo-|zel-|balsam|mgielka|mydlo|krem|olejek|swieca|po-goleniu|aftershave|body|hair|wlos";

export const STORE_PROFILES: StoreProfile[] = [
  {
    slug: "live-perfumeria-pl", name: "Perfumeria.pl", country: "PL", currency: "PLN", websiteUrl: "https://www.perfumeria.pl",
    accessStatus: "PUBLIC_ACCESS_SUPPORTED",
    finding: "robots.txt allows product pages; sitemap published; JSON-LD Product with price, PLN, availability and GTIN-13.",
    crawl: {
      titleExclude: NOT_RETAIL_UNIT, inlineVariants: true,
      sitemapInclude: "sitemap_products_", urlInclude: `^/products/[^/]*(${FRAGRANCE_PATH})`, urlExclude: NOT_SINGLE_BOTTLE,
      brandPrefixOnly: true, minDelayMs: 5000, maxPagesPerRun: 30, maxSitemapsPerRun: 3, recheckHours: 24,
    },
  },
  {
    slug: "live-e-glamour-pl", name: "E-Glamour", country: "PL", currency: "PLN", websiteUrl: "https://www.e-glamour.pl",
    accessStatus: "PUBLIC_ACCESS_SUPPORTED",
    finding: "robots.txt allows product pages; sitemap published; JSON-LD Product with price, PLN, availability, GTIN-13 and shipping rate.",
    crawl: {
      titleExclude: NOT_RETAIL_UNIT,
      sitemapInclude: "sitemap_products\\.xml", urlInclude: `^/[^/]*(${FRAGRANCE_PATH})[^/]*_z\\d+/?$`, urlExclude: NOT_SINGLE_BOTTLE,
      // Its CDN answered HTTP 403 after ~6 requests at 5 s spacing during the audit, so this source is paced far more slowly.
      brandPrefixOnly: true, minDelayMs: 20000, maxPagesPerRun: 12, maxSitemapsPerRun: 2, recheckHours: 48,
    },
  },
  { slug: "live-douglas-pl", name: "Douglas", country: "PL", currency: "PLN", websiteUrl: "https://www.douglas.pl", accessStatus: "RESTRICTED",
    finding: "robots.txt and product sitemap are readable, but the product page returned HTTP 403 to an identified bot. Not collected." },
  { slug: "live-notino-pl", name: "Notino", country: "PL", currency: "PLN", websiteUrl: "https://www.notino.pl", accessStatus: "RESTRICTED",
    finding: "robots.txt readable; the sitemap it advertises answers with a Cloudflare challenge (HTTP 403). Not collected." },
  { slug: "live-sephora-pl", name: "Sephora", country: "PL", currency: "PLN", websiteUrl: "https://www.sephora.pl", accessStatus: "RESTRICTED",
    finding: "HTTP 403 'Access Denied' (Akamai) already on robots.txt. Not collected." },
  { slug: "live-ceneo-pl", name: "Ceneo", country: "PL", currency: "PLN", websiteUrl: "https://www.ceneo.pl", accessStatus: "REQUIRES_PARTNERSHIP",
    finding: "Price-comparison aggregator; robots.txt sets Crawl-delay 120 s and lists 450+ disallow rules. Re-publishing its data needs an agreement." },
  { slug: "live-flaconi-de", name: "Flaconi", country: "DE", currency: "EUR", websiteUrl: "https://www.flaconi.de", accessStatus: "RESTRICTED",
    finding: "Cloudflare challenge (HTTP 403) already on robots.txt. Not collected." },
  { slug: "live-marionnaud-fr", name: "Marionnaud", country: "FR", currency: "EUR", websiteUrl: "https://www.marionnaud.fr", accessStatus: "RESTRICTED",
    finding: "HTTP 403 'Access Denied' (Akamai) already on robots.txt. Not collected." },
  { slug: "live-sephora-fr", name: "Sephora", country: "FR", currency: "EUR", websiteUrl: "https://www.sephora.fr", accessStatus: "RESTRICTED",
    finding: "HTTP 403 'Access Denied' (Akamai) already on robots.txt. Not collected." },
  { slug: "live-sephora-de", name: "Sephora", country: "DE", currency: "EUR", websiteUrl: "https://www.sephora.de", accessStatus: "RESTRICTED",
    finding: "HTTP 403 'Access Denied' (Akamai) already on robots.txt. Not collected." },
  { slug: "live-douglas-de", name: "Douglas", country: "DE", currency: "EUR", websiteUrl: "https://www.douglas.de", accessStatus: "NOT_VERIFIED",
    finding: "robots.txt readable and similar to douglas.pl; product pages were not requested after douglas.pl refused them." },
  { slug: "live-notino-de", name: "Notino", country: "DE", currency: "EUR", websiteUrl: "https://www.notino.de", accessStatus: "NOT_VERIFIED",
    finding: "robots.txt readable (same rules as notino.pl); content not requested after notino.pl answered with a challenge." },
];

export function getProfile(slug: string): StoreProfile | undefined {
  return STORE_PROFILES.find((p) => p.slug === slug);
}

/** Slug prefixes under which a brand appears in store URLs. */
export const BRAND_SLUG_ALIASES: Record<string, string[]> = {
  "Dior": ["dior", "christian-dior"],
  "Yves Saint Laurent": ["yves-saint-laurent", "ysl"],
  "Giorgio Armani": ["giorgio-armani", "armani", "emporio-armani"],
  "Maison Francis Kurkdjian": ["maison-francis-kurkdjian", "mfk"],
  "Parfums de Marly": ["parfums-de-marly"],
  "Jean Paul Gaultier": ["jean-paul-gaultier"],
};
