import type { FeedFormatName } from "./parse";

/** For each standard field: candidate paths in the source record, first non-empty wins. */
export interface FieldMap {
  externalId: string[];
  title: string[];
  /** Extra path appended to the title (e.g. a variant name carrying the size). */
  titleSuffix?: string[];
  brand?: string[];
  ean?: string[];
  price: string[];
  /** A lower promotional price; when present the regular price becomes the 'was' price. */
  salePrice?: string[];
  originalPrice?: string[];
  currency?: string[];
  availability?: string[];
  url?: string[];
  /** Built from record fields and {websiteUrl} when the feed carries no absolute URL. */
  urlTemplate?: string;
  imageUrl?: string[];
  shipping?: string[];
  category?: string[];
}

export interface FeedPreset {
  key: string;
  label: string;
  format: FeedFormatName;
  recordPath?: string;
  explode?: string;
  fields: FieldMap;
  /** Raw availability values (lower-cased) → state, checked before the generic heuristics. */
  availabilityMap?: Record<string, "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN">;
  notes: string;
}

/**
 * Format presets, not store integrations: each describes a widely used feed *layout*.
 * A retailer is connected by pointing a source at a feed URL you are entitled to use
 * and choosing the layout it follows.
 */
export const FEED_PRESETS: FeedPreset[] = [
  {
    key: "awin-csv",
    label: "Awin product feed (CSV)",
    format: "CSV",
    fields: {
      externalId: ["aw_product_id", "merchant_product_id"],
      title: ["product_name"],
      brand: ["brand_name"],
      ean: ["ean", "product_GTIN", "upc"],
      price: ["search_price", "store_price"],
      originalPrice: ["rrp_price", "product_price_old"],
      currency: ["currency"],
      availability: ["in_stock", "stock_status"],
      url: ["aw_deep_link", "merchant_deep_link"],
      imageUrl: ["merchant_image_url", "aw_image_url"],
      shipping: ["delivery_cost"],
      category: ["merchant_category", "category_name"],
    },
    notes: "Create-a-Feed download. Select at least: aw_product_id, product_name, brand_name, ean, search_price, rrp_price, currency, in_stock, aw_deep_link, delivery_cost, merchant_category.",
  },
  {
    key: "google-shopping-xml",
    label: "Google Merchant / Shopping feed (XML)",
    format: "XML",
    fields: {
      externalId: ["g:id", "id"],
      title: ["g:title", "title"],
      brand: ["g:brand"],
      ean: ["g:gtin", "g:ean"],
      price: ["g:price"],
      salePrice: ["g:sale_price"],
      availability: ["g:availability"],
      url: ["g:link", "link"],
      imageUrl: ["g:image_link"],
      shipping: ["g:shipping.g:price"],
      category: ["g:product_type", "g:google_product_category"],
    },
    notes: "RSS 2.0 or Atom with the g: namespace. Prices carry their currency (\"389.00 PLN\").",
  },
  {
    key: "ceneo-xml",
    label: "Ceneo offer feed (XML)",
    format: "XML",
    recordPath: "offers.o",
    fields: {
      externalId: ["@id"],
      title: ["name"],
      brand: ["attrs.a[@name=Producent]"],
      ean: ["attrs.a[@name=EAN]"],
      price: ["@price"],
      availability: ["@avail"],
      url: ["@url"],
      imageUrl: ["imgs.main.@url"],
      category: ["cat"],
    },
    // Ceneo `avail` is a dispatch time in days; 99 means "check in store".
    availabilityMap: { "1": "IN_STOCK", "3": "IN_STOCK", "7": "IN_STOCK", "14": "IN_STOCK", "99": "UNKNOWN", "110": "UNKNOWN" },
    notes: "The XML a shop generates for Ceneo. Use only with the shop's consent; prices are PLN.",
  },
  {
    key: "shopify-json",
    label: "Shopify catalogue export (JSON)",
    format: "JSON",
    recordPath: "products",
    explode: "variants",
    fields: {
      externalId: ["variants.id"],
      title: ["title"],
      titleSuffix: ["variants.title"],
      brand: ["vendor"],
      ean: ["variants.barcode"],
      price: ["variants.price"],
      originalPrice: ["variants.compare_at_price"],
      availability: ["variants.available"],
      urlTemplate: "{websiteUrl}/products/{handle}?variant={variants.id}",
      imageUrl: ["images.0.src"],
      category: ["product_type"],
    },
    notes: "Product JSON in Shopify's catalogue shape. Use only with the merchant's permission.",
  },
  {
    key: "generic-csv",
    label: "Generic CSV (common column names)",
    format: "CSV",
    fields: {
      externalId: ["id", "sku", "product_id"],
      title: ["title", "name", "product_name"],
      brand: ["brand", "manufacturer"],
      ean: ["ean", "gtin", "barcode"],
      price: ["price", "sale_price"],
      originalPrice: ["regular_price", "old_price", "rrp"],
      currency: ["currency"],
      availability: ["availability", "in_stock", "stock"],
      url: ["url", "link"],
      imageUrl: ["image", "image_url", "image_link"],
      shipping: ["shipping", "delivery_cost"],
      category: ["category"],
    },
    notes: "Override individual columns with feedOptions.fields when names differ.",
  },
];

export function getPreset(key: string | null | undefined): FeedPreset | undefined {
  return FEED_PRESETS.find((p) => p.key === key);
}
