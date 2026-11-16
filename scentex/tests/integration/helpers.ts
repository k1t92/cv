import type { Prisma, Retailer } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CrawlConfig } from "@/engine/crawl/stores";
import type { AdapterContext } from "@/engine/types";

export { prisma };

export async function resetDatabase() {
  if (!process.env.DATABASE_URL?.includes("schema=scentex_test")) throw new Error("Refusing to wipe a non-test database");
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Notification","PriceAlert","WatchlistItem","Deal","ProductStats","PriceChange","PriceSnapshot","ScraperJob","CrawlPage","RetailerProduct","Product","Retailer","Brand","ExchangeRate","User" CASCADE',
  );
}

/** Valid EAN-13 from a 12-digit stem. */
export function ean13(stem: string): string {
  const sum = stem.split("").map(Number).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return stem + String((10 - (sum % 10)) % 10);
}

export const ORIGIN = "https://shop.example";
export const CRAWL: CrawlConfig = {
  sitemapUrls: [`${ORIGIN}/sitemap.xml`], urlInclude: "^/p/", brandPrefixOnly: false,
  minDelayMs: 2000, maxPagesPerRun: 50, maxSitemapsPerRun: 5, recheckHours: 24,
};

export function publicSource(overrides: Partial<Prisma.RetailerUncheckedCreateInput> = {}): Promise<Retailer> {
  return prisma.retailer.create({
    data: {
      slug: "live-shop", name: "Shop", country: "PL", currency: "PLN", websiteUrl: ORIGIN, sourceKind: "STRUCTURED_DATA", adapterKey: "public",
      enabled: true, accessStatus: "PUBLIC_ACCESS_SUPPORTED", crawlConfig: CRAWL as unknown as Prisma.InputJsonValue, ...overrides,
    },
  });
}

export function productPage(title: string, ean: string, price: number, brand = "Example House"): string {
  const node = { "@context": "https://schema.org", "@type": "Product", name: title, gtin13: ean, brand: { "@type": "Brand", name: brand }, offers: { "@type": "Offer", price, priceCurrency: "PLN", availability: "https://schema.org/InStock" } };
  return `<html><head><script type="application/ld+json">${JSON.stringify(node)}</script></head><body>${"x".repeat(500)}</body></html>`;
}

type Canned = { status?: number; body?: string | null; headers?: Record<string, string> };

/** In-memory stand-in for a shop: canned responses, and a log of every request made. */
export class FakeSite {
  routes = new Map<string, Canned>();
  log: string[] = [];

  constructor(pages: Record<string, string>) {
    this.routes.set(`${ORIGIN}/robots.txt`, { body: "User-agent: *\nDisallow: /cart\n" });
    this.setSitemap(Object.keys(pages));
    for (const [path, html] of Object.entries(pages)) this.routes.set(ORIGIN + path, { body: html });
  }

  setSitemap(paths: string[]) {
    this.routes.set(`${ORIGIN}/sitemap.xml`, { body: `<urlset>${paths.map((p) => `<url><loc>${ORIGIN}${p}</loc></url>`).join("")}</urlset>` });
  }

  http: NonNullable<AdapterContext["http"]> = async (url) => {
    this.log.push(url.replace(ORIGIN, ""));
    const route = this.routes.get(url);
    const status = route ? route.status ?? 200 : 404;
    return { status, body: status === 200 ? route?.body ?? "" : null, headers: route?.headers ?? {}, finalUrl: url, bodyPreview: status === 200 ? undefined : route?.body ?? undefined };
  };
}

export const at = (iso: string) => new Date(iso);
export const counts = async () => ({
  offers: await prisma.retailerProduct.count(),
  snapshots: await prisma.priceSnapshot.count(),
  changes: await prisma.priceChange.count(),
  products: await prisma.product.count(),
});
