import { XMLParser } from "fast-xml-parser";

export interface SitemapEntry {
  loc: string;
  lastmod: Date | null;
}

export interface ParsedSitemap {
  /** Child sitemaps (when the document is a sitemap index). */
  sitemaps: SitemapEntry[];
  /** Page URLs (when the document is a urlset). */
  urls: SitemapEntry[];
}

const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true });

function entries(node: unknown): SitemapEntry[] {
  const list = Array.isArray(node) ? node : node == null ? [] : [node];
  const out: SitemapEntry[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const loc = (item as Record<string, unknown>).loc;
    if (typeof loc !== "string" || !/^https?:\/\//i.test(loc)) continue;
    const raw = (item as Record<string, unknown>).lastmod;
    const date = typeof raw === "string" ? new Date(raw) : null;
    out.push({ loc: loc.trim(), lastmod: date && !Number.isNaN(date.getTime()) ? date : null });
  }
  return out;
}

export function parseSitemap(xml: string): ParsedSitemap {
  const doc = parser.parse(xml) as Record<string, Record<string, unknown> | undefined>;
  return { sitemaps: entries(doc.sitemapindex?.sitemap), urls: entries(doc.urlset?.url) };
}
