/**
 * Public-page collector ("public" adapter).
 *
 * For sources whose audit status is PUBLIC_ACCESS_SUPPORTED it:
 *   1. re-reads robots.txt (daily) and obeys it, including Crawl-delay;
 *   2. discovers product pages from the site's own published sitemaps;
 *   3. requests a small, rate-limited batch of due pages with conditional GETs;
 *   4. extracts schema.org structured data and hands standard offers to the ingest pipeline.
 *
 * It never executes page scripts, never logs in, never retries around a refusal. A 401/403 or an
 * anti-bot challenge switches the source off until a human reviews it.
 */
import type { Prisma, PrismaClient, Retailer } from "@prisma/client";
import { slugify } from "../demo/catalog";
import { BOT_CONTACT, safeGet, type SafeResponse } from "../feeds/fetch";
import { extractProduct, looksLikeChallenge } from "../crawl/extract";
import { disallowsEverything, isAllowed, parseRobots, rulesFor, type RobotsRules } from "../crawl/robots";
import { parseSitemap } from "../crawl/sitemap";
import { BRAND_SLUG_ALIASES, type CrawlConfig } from "../crawl/stores";
import type { RawOffer, RetailerAdapter } from "../types";

const BOT_TOKEN = "scentex-bot";
const ROBOTS_TTL_MS = 24 * 3_600_000;
const SITEMAP_RECHECK_MS = 24 * 3_600_000;
const MIN_DELAY_FLOOR_MS = 2000;
const PAGE_MAX_BYTES = 3 * 1024 * 1024;
const SITEMAP_MAX_BYTES = 30 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 25_000;

export class SourceBlockedError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const hours = (h: number) => h * 3_600_000;
const pathOf = (url: string) => {
  const u = new URL(url);
  return u.pathname + u.search;
};

async function blockSource(prisma: PrismaClient, retailer: Retailer, reason: string): Promise<never> {
  await prisma.retailer.update({
    where: { id: retailer.id },
    data: { enabled: false, blockedAt: new Date(), blockedReason: reason.slice(0, 500), accessStatus: "RESTRICTED" },
  });
  throw new SourceBlockedError(`${reason} Automatic collection has been switched off for this source.`);
}

/** First words of a refusal page, so the admin can see who refused (site, CDN, WAF) without re-requesting. */
function excerpt(response: SafeResponse): string {
  const server = typeof response.headers.server === "string" ? ` server=${response.headers.server}` : "";
  return `[${server.trim()}${response.bodyPreview ? ` body="${response.bodyPreview}"` : ""}]`;
}

/** Refusals are final for this run and for the source; rate-limit answers just end the run. */
async function guard(prisma: PrismaClient, retailer: Retailer, response: SafeResponse, what: string): Promise<void> {
  if (looksLikeChallenge(response.status, response.body, response.headers)) {
    await blockSource(prisma, retailer, `${what} answered with an anti-bot challenge (HTTP ${response.status}) ${excerpt(response)}.`);
  }
  if (response.status === 401 || response.status === 403) await blockSource(prisma, retailer, `${what} answered HTTP ${response.status} (access refused) ${excerpt(response)}.`);
  if (response.status === 429 || response.status === 503) throw new Error(`${what} answered HTTP ${response.status}; backing off`);
}

export function brandPrefixes(brandNames: string[]): string[] {
  return [...new Set(brandNames.flatMap((name) => BRAND_SLUG_ALIASES[name] ?? [slugify(name)]))];
}

/** Decide from the URL alone whether a sitemap entry is worth requesting. */
export function wantsUrl(url: string, origin: string, config: CrawlConfig, prefixes: string[]): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.origin !== origin) return false;
  const path = decodeURIComponent(parsed.pathname).toLowerCase();
  if (!new RegExp(config.urlInclude, "i").test(path)) return false;
  if (config.urlExclude && new RegExp(config.urlExclude, "i").test(path)) return false;
  if (!config.brandPrefixOnly) return true;
  const slug = path.split("/").filter(Boolean).pop() ?? "";
  return prefixes.some((prefix) => slug.startsWith(`${prefix}-`));
}

export const publicAdapter: RetailerAdapter = {
  key: "public",
  partial: true,
  async fetchOffers(retailer, ctx) {
    const prisma = ctx.prisma;
    const config = retailer.crawlConfig as unknown as CrawlConfig | null;
    if (retailer.accessStatus !== "PUBLIC_ACCESS_SUPPORTED" || !config) {
      throw new Error(`Source is ${retailer.accessStatus}: public collection is not permitted for it`);
    }
    if (retailer.blockedAt) throw new Error(`Source was blocked: ${retailer.blockedReason ?? "access refused"}`);
    if (!BOT_CONTACT && !ctx.allowNoContact) {
      throw new Error("BOT_CONTACT is not set. Public collection requires a contact address in the User-Agent.");
    }
    const origin = new URL(retailer.websiteUrl).origin;
    const get = (url: string, maxBytes: number, headers?: Record<string, string>) =>
      safeGet(url, { maxBytes, timeoutMs: REQUEST_TIMEOUT_MS, sameHostOnly: true, headers: { Accept: "text/html,application/xml;q=0.9,*/*;q=0.5", ...headers } });

    // ---- 1. robots.txt -------------------------------------------------
    let robotsText = retailer.robotsTxt;
    let requests = 0;
    if (!robotsText || !retailer.robotsFetchedAt || ctx.now.getTime() - retailer.robotsFetchedAt.getTime() > ROBOTS_TTL_MS) {
      const response = await get(`${origin}/robots.txt`, 512 * 1024);
      requests++;
      await guard(prisma, retailer, response, "robots.txt");
      // RFC 9309: 4xx (other than a refusal) means "no restrictions"; 5xx means "assume disallowed".
      if (response.status >= 500) throw new Error(`robots.txt unavailable (HTTP ${response.status}); not crawling without it`);
      robotsText = response.body ?? "";
      await prisma.retailer.update({ where: { id: retailer.id }, data: { robotsTxt: robotsText, robotsFetchedAt: ctx.now } });
    }
    const robots = parseRobots(robotsText);
    const rules: RobotsRules = rulesFor(robots, BOT_TOKEN);
    if (disallowsEverything(rules)) await blockSource(prisma, retailer, "robots.txt disallows all automated access.");
    const delayMs = Math.max(MIN_DELAY_FLOOR_MS, config.minDelayMs, (rules.crawlDelaySeconds ?? 0) * 1000);
    const pace = async () => {
      if (requests++ > 0) await sleep(delayMs);
    };

    // ---- 2. discovery from sitemaps -----------------------------------
    const brands = await prisma.brand.findMany({ select: { name: true } });
    const brandNames = brands.map((b) => b.name);
    const prefixes = brandPrefixes(brandNames);
    const entryPoints = config.sitemapUrls?.length ? config.sitemapUrls : robots.sitemaps;
    for (const url of entryPoints) {
      if (new URL(url).origin !== origin) continue;
      await prisma.crawlPage.upsert({
        where: { retailerId_url: { retailerId: retailer.id, url } },
        create: { retailerId: retailer.id, url, isSitemap: true, priority: 10, nextCheckAt: ctx.now },
        update: {},
      });
    }
    // One sitemap at a time, re-querying after each: an index processed now makes its children due in this same run.
    for (let budget = config.maxSitemapsPerRun; budget > 0; budget--) {
      const sitemap = await prisma.crawlPage.findFirst({
        where: { retailerId: retailer.id, isSitemap: true, nextCheckAt: { lte: ctx.now } },
        orderBy: [{ priority: "desc" }, { lastFetchedAt: { sort: "asc", nulls: "first" } }, { url: "asc" }],
      });
      if (!sitemap) break;
      if (!isAllowed(rules, pathOf(sitemap.url))) {
        await prisma.crawlPage.update({ where: { id: sitemap.id }, data: { status: "DISALLOWED", nextCheckAt: new Date(ctx.now.getTime() + SITEMAP_RECHECK_MS) } });
        continue;
      }
      await pace();
      const response = await get(sitemap.url, SITEMAP_MAX_BYTES, {
        ...(sitemap.etag ? { "If-None-Match": sitemap.etag } : {}),
        ...(sitemap.lastModified ? { "If-Modified-Since": sitemap.lastModified } : {}),
      });
      await guard(prisma, retailer, response, "Sitemap");
      const state = {
        httpStatus: response.status, lastFetchedAt: ctx.now, nextCheckAt: new Date(ctx.now.getTime() + SITEMAP_RECHECK_MS),
        etag: (response.headers.etag as string | undefined) ?? sitemap.etag, lastModified: (response.headers["last-modified"] as string | undefined) ?? sitemap.lastModified,
      };
      if (response.status === 304 || !response.body) {
        await prisma.crawlPage.update({ where: { id: sitemap.id }, data: { ...state, status: response.status === 304 ? "OK" : "ERROR" } });
        continue;
      }
      const parsed = parseSitemap(response.body);
      const children = parsed.sitemaps.filter((s) => new URL(s.loc).origin === origin && (!config.sitemapInclude || new RegExp(config.sitemapInclude, "i").test(s.loc)));
      const pages = parsed.urls.filter((u) => wantsUrl(u.loc, origin, config, prefixes) && isAllowed(rules, pathOf(u.loc)));
      const known = new Set((await prisma.crawlPage.findMany({ where: { retailerId: retailer.id, url: { in: [...children, ...pages].map((e) => e.loc) } }, select: { url: true } })).map((p) => p.url));
      const fresh = [
        ...children.filter((c) => !known.has(c.loc)).map((c) => ({ retailerId: retailer.id, url: c.loc, isSitemap: true, sitemapLastmod: c.lastmod, nextCheckAt: ctx.now })),
        ...pages.filter((p) => !known.has(p.loc)).map((p) => ({ retailerId: retailer.id, url: p.loc, isSitemap: false, sitemapLastmod: p.lastmod, nextCheckAt: ctx.now })),
      ];
      if (fresh.length) await prisma.crawlPage.createMany({ data: fresh, skipDuplicates: true });
      await prisma.crawlPage.update({ where: { id: sitemap.id }, data: { ...state, status: "OK", detail: `${parsed.urls.length} urls, ${pages.length} wanted, ${fresh.length} new` } });
    }

    // ---- 3. fetch a batch of due product pages -------------------------
    const due = await prisma.crawlPage.findMany({
      where: { retailerId: retailer.id, isSitemap: false, nextCheckAt: { lte: ctx.now } },
      orderBy: [{ priority: "desc" }, { lastFetchedAt: { sort: "asc", nulls: "first" } }],
      take: config.maxPagesPerRun,
    });
    const offers: RawOffer[] = [];
    const recheck = new Date(ctx.now.getTime() + hours(config.recheckHours));

    for (const page of due) {
      const cached = (page.lastOffers as unknown as RawOffer[] | null) ?? [];
      if (!isAllowed(rules, pathOf(page.url))) {
        await prisma.crawlPage.update({ where: { id: page.id }, data: { status: "DISALLOWED", nextCheckAt: recheck } });
        continue;
      }
      await pace();
      let response: SafeResponse;
      try {
        response = await get(page.url, PAGE_MAX_BYTES, {
          ...(page.etag ? { "If-None-Match": page.etag } : {}),
          ...(page.lastModified ? { "If-Modified-Since": page.lastModified } : {}),
        });
      } catch (error) {
        // One unreachable page must not sink the run; back the page off instead.
        const failures = page.failures + 1;
        await prisma.crawlPage.update({
          where: { id: page.id },
          data: { status: "ERROR", failures, detail: (error instanceof Error ? error.message : String(error)).slice(0, 300), lastFetchedAt: ctx.now, nextCheckAt: new Date(ctx.now.getTime() + hours(config.recheckHours * Math.min(8, 2 ** failures))) },
        });
        continue;
      }
      try {
        await guard(prisma, retailer, response, "A product page");
      } catch (error) {
        // Stop asking immediately, but keep the prices already confirmed in this run.
        ctx.warnings.push(error instanceof Error ? error.message : String(error));
        await prisma.crawlPage.update({ where: { id: page.id }, data: { status: "ERROR", httpStatus: response.status, lastFetchedAt: ctx.now, detail: "Refused; source switched off" } });
        break;
      }

      const base: Prisma.CrawlPageUpdateInput = {
        httpStatus: response.status, lastFetchedAt: ctx.now, nextCheckAt: recheck, failures: 0,
        etag: (response.headers.etag as string | undefined) ?? page.etag, lastModified: (response.headers["last-modified"] as string | undefined) ?? page.lastModified,
      };
      if (response.status === 304) {
        // Unchanged since last time: the previously extracted offers are confirmed as still current.
        offers.push(...cached);
        await prisma.crawlPage.update({ where: { id: page.id }, data: base });
        continue;
      }
      if (response.status === 404 || response.status === 410) {
        // The listing is gone: keep its last price in history but stop presenting it as purchasable.
        offers.push(...cached.map((o) => ({ ...o, availability: "UNKNOWN" as const })));
        await prisma.crawlPage.update({ where: { id: page.id }, data: { ...base, status: "GONE", nextCheckAt: new Date(ctx.now.getTime() + hours(config.recheckHours * 7)) } });
        continue;
      }
      if (response.status !== 200 || response.body == null) {
        await prisma.crawlPage.update({ where: { id: page.id }, data: { ...base, status: "ERROR", detail: `HTTP ${response.status}`, failures: page.failures + 1 } });
        continue;
      }
      const result = extractProduct(response.body, response.finalUrl, {
        currency: retailer.currency, knownBrands: brandNames, titleExclude: config.titleExclude, inlineVariants: config.inlineVariants,
      });
      if (result.status === "OK") offers.push(...result.offers);
      await prisma.crawlPage.update({
        where: { id: page.id },
        data: {
          ...base, status: result.status, detail: result.detail ?? result.method,
          lastOffers: result.status === "OK" ? (result.offers as unknown as Prisma.InputJsonValue) : undefined,
          // Pages that are not fragrances will not become fragrances: look again rarely.
          nextCheckAt: result.status === "OK" ? recheck : new Date(ctx.now.getTime() + hours(config.recheckHours * (result.status === "NOT_FRAGRANCE" ? 30 : 4))),
        },
      });
    }
    return offers;
  },
};
