/**
 * Structured-data extraction from a public product page.
 * Reads only what the page publishes as data: JSON-LD (schema.org Product / Offer) first,
 * Open Graph product metadata as a fallback. No scripts are executed and nothing is inferred:
 * a missing or ambiguous price yields a status, never a guessed or zero price.
 * Reviews and reviewer names present in the same markup are deliberately never read.
 */
import { parsePrice } from "../feeds/mapping";
import { isValidGtin, normalizeBrand, normalizeText, parseConcentration } from "../matching";
import type { RawOffer } from "../types";

export type ExtractStatus = "OK" | "NOT_FRAGRANCE" | "NO_PRODUCT" | "NO_PRICE" | "AMBIGUOUS_PRICE" | "UNSUPPORTED_CURRENCY";

export interface Extraction {
  status: ExtractStatus;
  offers: RawOffer[];
  method: "json-ld" | "meta" | null;
  detail?: string;
}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);
const text = (v: unknown): string | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v !== "string") return undefined;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t : undefined;
};
const hasType = (node: Json, type: string) => list(node["@type"]).some((t) => typeof t === "string" && t.replace(/^https?:\/\/schema\.org\//, "") === type);

function decodeEntities(value: string): string {
  return value.replace(/&(amp|quot|#39|apos|lt|gt);/g, (_, e: string) => ({ amp: "&", quot: '"', "#39": "'", apos: "'", lt: "<", gt: ">" })[e] ?? "");
}

/** All JSON-LD nodes on the page, flattened through arrays and @graph. Malformed blocks are skipped. */
export function jsonLdNodes(html: string): Json[] {
  const nodes: Json[] = [];
  const pattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]!.trim());
    } catch {
      continue;
    }
    const walk = (value: unknown) => {
      for (const item of list(value)) {
        if (!isObject(item)) continue;
        nodes.push(item);
        if (item["@graph"]) walk(item["@graph"]);
      }
    };
    walk(parsed);
  }
  return nodes;
}

function metaContent(html: string, property: string): string | undefined {
  const tag = html.match(new RegExp(`<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${property}["'][^>]*>`, "i"))?.[0];
  const content = tag?.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
  return content ? decodeEntities(content).trim() || undefined : undefined;
}

const AVAILABILITY: Record<string, RawOffer["availability"]> = {
  instock: "IN_STOCK", onlineonly: "IN_STOCK", limitedavailability: "IN_STOCK", instoreonly: "OUT_OF_STOCK",
  outofstock: "OUT_OF_STOCK", soldout: "OUT_OF_STOCK", discontinued: "OUT_OF_STOCK", backorder: "OUT_OF_STOCK", preorder: "OUT_OF_STOCK",
};

function availabilityOf(value: unknown): RawOffer["availability"] {
  const key = text(value)?.replace(/^https?:\/\/schema\.org\//i, "").toLowerCase();
  return (key && AVAILABILITY[key]) || "UNKNOWN";
}

function gtinOf(...nodes: (Json | undefined)[]): string | undefined {
  for (const node of nodes) {
    if (!node) continue;
    for (const key of ["gtin13", "gtin", "gtin14", "gtin12", "gtin8"]) {
      const digits = text(node[key])?.replace(/\D/g, "");
      // Only barcodes with a correct check digit are kept; anything else is treated as absent.
      if (digits && isValidGtin(digits)) return digits;
    }
  }
  return undefined;
}

function webUrl(value: unknown, base: string): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** 'Was' price, only when the page states it as structured data (schema.org priceSpecification). */
function listedPrice(offer: Json): number | undefined {
  for (const spec of list(offer.priceSpecification)) {
    if (!isObject(spec)) continue;
    const type = text(spec.priceType)?.toLowerCase() ?? "";
    if (/strikethroughprice|listprice|msrp|srp/.test(type)) return parsePrice(text(spec.price))?.minor;
  }
  return undefined;
}

/** A known brand at the start of the title, for pages whose markup omits `brand`. */
function brandFromTitle(title: string, knownBrands: string[]): string | undefined {
  const normalized = normalizeText(title);
  return [...knownBrands].sort((a, b) => b.length - a.length).find((brand) => normalized.startsWith(normalizeBrand(brand) + " ") || normalized.startsWith(normalizeText(brand) + " "));
}

/**
 * Variant names published as inline data on Shopify storefronts (`var meta = {"product":{"variants":[…]}}`).
 * The text is parsed as JSON; no script is executed. Returns sku → variant name.
 */
export function inlineVariantNames(html: string): Map<string, string> {
  const names = new Map<string, string>();
  const start = html.indexOf('"variants":[', html.indexOf("var meta = {"));
  if (html.indexOf("var meta = {") === -1 || start === -1) return names;
  const from = start + '"variants":'.length;
  let depth = 0;
  let inString = false;
  for (let i = from; i < Math.min(html.length, from + 200_000); i++) {
    const ch = html[i]!;
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "[") depth++;
    else if (ch === "]" && --depth === 0) {
      try {
        for (const variant of JSON.parse(html.slice(from, i + 1)) as unknown[]) {
          if (!isObject(variant)) continue;
          const sku = text(variant.sku);
          const name = text(variant.public_title) ?? text(variant.name);
          if (sku && name) names.set(sku, name);
        }
      } catch {
        // Not valid JSON: ignore, the offer simply keeps its shorter title.
      }
      break;
    }
  }
  return names;
}

export interface ExtractOptions {
  /** Read variant names from inline storefront data when an offer's own title lacks the size. */
  inlineVariants?: boolean;
  /** Listings whose title matches are not the standard retail unit (testers, unboxed stock, sets). */
  titleExclude?: string;
  /** Canonical brand names, used only when the page's own markup has no brand. */
  knownBrands?: string[];
  /** Currency the retailer trades in; offers in any other currency are not accepted. */
  currency: "PLN" | "EUR";
}

export function extractProduct(html: string, pageUrl: string, options: ExtractOptions): Extraction {
  const products = jsonLdNodes(html).filter((n) => hasType(n, "Product"));

  if (products.length === 0) return extractFromMeta(html, pageUrl, options);
  // Several distinct Product nodes on one page (e.g. recommendations) give no way to tell which is the page's own.
  if (products.length > 1 && new Set(products.map((p) => text(p.name))).size > 1) {
    return { status: "AMBIGUOUS_PRICE", offers: [], method: "json-ld", detail: `${products.length} different Product nodes` };
  }
  const product = products[0]!;
  const name = text(product.name);
  if (!name) return { status: "NO_PRODUCT", offers: [], method: "json-ld", detail: "Product has no name" };

  const brandNode = product.brand;
  const brand = (isObject(brandNode) ? text(brandNode.name) : text(brandNode)) ?? brandFromTitle(name, options.knownBrands ?? []);
  const image = webUrl(list(product.image).map((i) => (isObject(i) ? i.url : i))[0], pageUrl);

  const offerNodes = list(product.offers).filter(isObject);
  if (offerNodes.some((o) => hasType(o, "AggregateOffer"))) {
    return { status: "AMBIGUOUS_PRICE", offers: [], method: "json-ld", detail: "AggregateOffer (price range, not a price)" };
  }
  if (offerNodes.length === 0) return { status: "NO_PRICE", offers: [], method: "json-ld", detail: "Product has no offers" };

  const offers: RawOffer[] = [];
  let unsupported = 0;
  const variantNames = options.inlineVariants ? inlineVariantNames(html) : new Map<string, string>();
  for (const offer of offerNodes) {
    const price = parsePrice(text(offer.price) ?? text(isObject(offer.priceSpecification) ? offer.priceSpecification.price : undefined));
    const currency = text(offer.priceCurrency)?.toUpperCase();
    if (!price) continue;
    if (currency !== options.currency) {
      unsupported++;
      continue;
    }
    // Variant label: the offer's own name, else the storefront's inline variant name for the same SKU.
    const inline = variantNames.get(text(offer.sku) ?? "");
    const variant = text(offer.name) ?? (inline && inline.startsWith(name) ? inline.slice(name.length).replace(/^[\s\-–/]+/, "") : inline);
    const squash = (value: string) => value.toLowerCase().replace(/\s+/g, "");
    const title = variant && !squash(name).includes(squash(variant)) ? `${name} ${variant}` : name;
    const gtin = gtinOf(offer, offerNodes.length === 1 ? product : undefined);
    const url = webUrl(offer.url, pageUrl) ?? pageUrl;
    const id = text(offer.sku) ?? gtin ?? (offerNodes.length === 1 ? text(product.sku) ?? text(product.productID) : undefined) ?? url;
    const original = listedPrice(offer);
    offers.push({
      externalId: id.slice(0, 200),
      title: (brand && !normalizeText(title).includes(normalizeBrand(brand)) ? `${brand} ${title}` : title).slice(0, 500),
      brand,
      ean: gtin,
      priceMinor: price.minor,
      originalPriceMinor: original != null && original > price.minor ? original : undefined,
      currency: options.currency,
      availability: availabilityOf(offer.availability),
      url,
      imageUrl: image,
    });
  }

  if (offers.length === 0) {
    return unsupported
      ? { status: "UNSUPPORTED_CURRENCY", offers: [], method: "json-ld", detail: `expected ${options.currency}` }
      : { status: "NO_PRICE", offers: [], method: "json-ld", detail: "No offer carries a price" };
  }
  // Two offers sharing one identity cannot be told apart: do not guess which price is which.
  if (new Set(offers.map((o) => o.externalId)).size !== offers.length) {
    return { status: "AMBIGUOUS_PRICE", offers: [], method: "json-ld", detail: "Several offers with the same identifier" };
  }
  const exclude = options.titleExclude ? new RegExp(options.titleExclude, "i") : null;
  const fragrance = offers.filter((o) => parseConcentration(o.title) != null && !exclude?.test(o.title));
  if (fragrance.length === 0) return { status: "NOT_FRAGRANCE", offers: [], method: "json-ld", detail: name.slice(0, 80) };
  return { status: "OK", offers: fragrance, method: "json-ld" };
}

function extractFromMeta(html: string, pageUrl: string, options: ExtractOptions): Extraction {
  const type = metaContent(html, "og:type");
  const amount = metaContent(html, "product:price:amount") ?? metaContent(html, "og:price:amount");
  const currency = (metaContent(html, "product:price:currency") ?? metaContent(html, "og:price:currency"))?.toUpperCase();
  const title = metaContent(html, "og:title");
  if (!amount && type !== "product" && type !== "og:product") return { status: "NO_PRODUCT", offers: [], method: null };
  if (!title) return { status: "NO_PRODUCT", offers: [], method: "meta", detail: "No og:title" };
  const price = parsePrice(amount);
  // Without an explicit currency the number is not a price we can stand behind.
  if (!price || !currency) return { status: "NO_PRICE", offers: [], method: "meta", detail: !price ? "No price metadata" : "Price without currency" };
  if (currency !== options.currency) return { status: "UNSUPPORTED_CURRENCY", offers: [], method: "meta", detail: `expected ${options.currency}` };
  if (parseConcentration(title) == null) return { status: "NOT_FRAGRANCE", offers: [], method: "meta", detail: title.slice(0, 80) };
  const availability = metaContent(html, "product:availability") ?? metaContent(html, "og:availability");
  return {
    status: "OK",
    method: "meta",
    offers: [{
      externalId: pageUrl.slice(0, 200),
      title: title.slice(0, 500),
      brand: metaContent(html, "product:brand") ?? brandFromTitle(title, options.knownBrands ?? []),
      priceMinor: price.minor,
      currency: options.currency,
      availability: availability ? availabilityOf(availability.replace(/\s+/g, "")) : "UNKNOWN",
      url: metaContent(html, "og:url") && webUrl(metaContent(html, "og:url"), pageUrl) || pageUrl,
      imageUrl: webUrl(metaContent(html, "og:image"), pageUrl),
    }],
  };
}

/** Page looks like an anti-bot interstitial rather than content: stop, never try to get past it. */
export function looksLikeChallenge(status: number, body: string | null, headers: Record<string, unknown>): boolean {
  if (headers["cf-mitigated"]) return true;
  if (!body) return false;
  const head = body.slice(0, 4000).toLowerCase();
  return /just a moment\.\.\.|attention required|access denied|captcha|are you a robot|verify you are human|pardon our interruption|request unsuccessful/.test(head)
    && (status === 403 || status === 429 || status === 503 || body.length < 20_000);
}
