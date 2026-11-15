import type { RawOffer } from "../types";
import { getPath, textOf, type FeedRecord } from "./parse";
import type { FeedPreset, FieldMap } from "./presets";

export interface MappingContext {
  websiteUrl: string;
  currency: "PLN" | "EUR";
  includePattern?: string;
  excludePattern?: string;
  /** Per-source overrides of the preset's field paths. */
  fields?: Partial<FieldMap>;
}

export type MapResult = { offer: Partial<RawOffer> & { externalId?: string } } | { skipped: "filtered" };

const CURRENCY_SIGNS: [RegExp, "PLN" | "EUR"][] = [[/pln|zł|zl\b/i, "PLN"], [/eur|€/i, "EUR"]];

/** Parse "1 299,00 zł", "389.00 PLN", "1.299,00", "1,299.00" into minor units (+ currency if stated). */
export function parsePrice(input: string | undefined): { minor: number; currency?: "PLN" | "EUR"; foreignCurrency?: boolean } | null {
  if (!input) return null;
  const currency = CURRENCY_SIGNS.find(([pattern]) => pattern.test(input))?.[1];
  const foreignCurrency = !currency && /[a-z$£]/i.test(input);
  let digits = input.replace(/[^\d.,]/g, "");
  if (!/\d/.test(digits)) return null;
  const lastComma = digits.lastIndexOf(",");
  const lastDot = digits.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    const decimal = lastComma > lastDot ? "," : ".";
    digits = digits.split(decimal === "," ? "." : ",").join("").replace(",", ".");
  } else if (lastComma !== -1) {
    // A lone comma is a decimal separator unless it is followed by exactly three digits (thousands).
    digits = /,\d{3}$/.test(digits) && digits.indexOf(",") === lastComma && digits.length - lastComma === 4 && lastComma > 0 && lastComma <= 3 && !/^0,/.test(digits)
      ? digits.replace(",", "")
      : digits.replace(/,(?=.*,)/g, "").replace(",", ".");
  } else if ((digits.match(/\./g) ?? []).length > 1) {
    digits = digits.replace(/\.(?=.*\.)/g, "");
  }
  const value = Number(digits);
  if (!Number.isFinite(value) || value <= 0) return null;
  return { minor: Math.round(value * 100), currency, foreignCurrency };
}

const IN_STOCK = /^(1|true|yes|y|in[ _-]?stock|instock|available|dostępny|dostepny|na stanie|auf lager|en stock)$/i;
const OUT_OF_STOCK = /^(0|false|no|n|out[ _-]?of[ _-]?stock|outofstock|sold[ _-]?out|unavailable|niedostępny|niedostepny|brak)$/i;

export function parseAvailability(value: string | undefined, map?: FeedPreset["availabilityMap"]): RawOffer["availability"] {
  if (value == null) return "UNKNOWN";
  const mapped = map?.[value.toLowerCase()];
  if (mapped) return mapped;
  if (IN_STOCK.test(value)) return "IN_STOCK";
  if (OUT_OF_STOCK.test(value)) return "OUT_OF_STOCK";
  // Numeric stock counts.
  if (/^\d+$/.test(value)) return Number(value) > 0 ? "IN_STOCK" : "OUT_OF_STOCK";
  return "UNKNOWN";
}

function absoluteUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Turn one feed record into the standard offer shape. The result is deliberately
 * unvalidated: the ingest pipeline applies the schema and counts what it rejects.
 */
export function mapRecord(record: FeedRecord, preset: FeedPreset, context: MappingContext): MapResult {
  const fields = { ...preset.fields, ...context.fields };
  const pick = (paths: string[] | undefined) => {
    for (const path of paths ?? []) {
      const text = textOf(getPath(record, path));
      if (text !== undefined) return text;
    }
    return undefined;
  };

  const suffix = pick(fields.titleSuffix);
  const base = pick(fields.title);
  // Shopify-style single-variant products use a placeholder variant title.
  const title = base && suffix && !/^default title$/i.test(suffix) && !base.includes(suffix) ? `${base} ${suffix}` : base;
  const category = pick(fields.category);

  const haystack = `${title ?? ""} ${category ?? ""}`;
  if (context.includePattern && !new RegExp(context.includePattern, "i").test(haystack)) return { skipped: "filtered" };
  if (context.excludePattern && new RegExp(context.excludePattern, "i").test(haystack)) return { skipped: "filtered" };

  const regular = parsePrice(pick(fields.price));
  const sale = parsePrice(pick(fields.salePrice));
  const listed = parsePrice(pick(fields.originalPrice));
  const price = sale && regular && sale.minor < regular.minor ? sale : regular;
  const original = sale && regular && sale.minor < regular.minor ? regular.minor : listed?.minor;

  const statedCurrency = pick(fields.currency)?.toUpperCase();
  const currency = statedCurrency ?? price?.currency ?? (price?.foreignCurrency ? "OTHER" : context.currency);

  const url = fields.urlTemplate && !pick(fields.url)
    ? fields.urlTemplate.replace(/\{([^}]+)\}/g, (_, key: string) => (key === "websiteUrl" ? context.websiteUrl.replace(/\/$/, "") : encodeURIComponent(textOf(getPath(record, key)) ?? "")))
    : pick(fields.url);

  const ean = pick(fields.ean)?.replace(/\D/g, "");
  const shipping = parsePrice(pick(fields.shipping));
  const shippingText = pick(fields.shipping);

  return {
    offer: {
      externalId: pick(fields.externalId),
      title,
      brand: pick(fields.brand),
      ean: ean && ean.length >= 8 && ean.length <= 14 ? ean : undefined,
      priceMinor: price?.minor,
      // A 'was' price at or below the current price is noise, not a discount.
      originalPriceMinor: original != null && price && original > price.minor ? original : undefined,
      currency: currency as RawOffer["currency"],
      availability: parseAvailability(pick(fields.availability), preset.availabilityMap),
      url: absoluteUrl(url, context.websiteUrl),
      imageUrl: absoluteUrl(pick(fields.imageUrl), context.websiteUrl),
      shippingMinor: shipping?.minor ?? (shippingText && /^0+([.,]0+)?(\s|$)/.test(shippingText) ? 0 : undefined),
    },
  };
}
