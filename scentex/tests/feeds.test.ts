import { describe, expect, it } from "vitest";
import { feedShrankTooMuch } from "@/engine/ingest";
import { mapRecord, parseAvailability, parsePrice, type MappingContext } from "@/engine/feeds/mapping";
import { getPath, parseFeed } from "@/engine/feeds/parse";
import { getPreset } from "@/engine/feeds/presets";
import { isDue, nextRunAt } from "@/engine/scheduler";
import { rawOfferSchema } from "@/engine/types";
import { modeOf, parseMode } from "@/lib/mode";

// Synthetic fixtures in each layout. They exercise the parser only and are never written to a database.
const ctx: MappingContext = { websiteUrl: "https://shop.example", currency: "PLN" };
const offerOf = (record: Record<string, unknown>, presetKey: string, context = ctx) => {
  const result = mapRecord(record, getPreset(presetKey)!, context);
  if (!("offer" in result)) throw new Error("record was filtered");
  return result.offer;
};

describe("price parsing", () => {
  it("handles European and English number formats", () => {
    expect(parsePrice("389.00 PLN")).toMatchObject({ minor: 38900, currency: "PLN" });
    expect(parsePrice("1 299,00 zł")).toMatchObject({ minor: 129900, currency: "PLN" });
    expect(parsePrice("1.299,50 €")).toMatchObject({ minor: 129950, currency: "EUR" });
    expect(parsePrice("1,299.50")).toMatchObject({ minor: 129950 });
    expect(parsePrice("389,9")).toMatchObject({ minor: 38990 });
    expect(parsePrice("1,299")).toMatchObject({ minor: 129900 });
    expect(parsePrice("89.99")).toMatchObject({ minor: 8999 });
  });

  it("rejects empty, zero and non-numeric input and flags foreign currencies", () => {
    expect(parsePrice(undefined)).toBeNull();
    expect(parsePrice("0.00")).toBeNull();
    expect(parsePrice("call us")).toBeNull();
    expect(parsePrice("49.00 GBP")).toMatchObject({ minor: 4900, foreignCurrency: true });
  });
});

describe("availability parsing", () => {
  it("understands common vocabularies and stock counts", () => {
    expect(parseAvailability("in stock")).toBe("IN_STOCK");
    expect(parseAvailability("in_stock")).toBe("IN_STOCK");
    expect(parseAvailability("1")).toBe("IN_STOCK");
    expect(parseAvailability("true")).toBe("IN_STOCK");
    expect(parseAvailability("out of stock")).toBe("OUT_OF_STOCK");
    expect(parseAvailability("0")).toBe("OUT_OF_STOCK");
    expect(parseAvailability("17")).toBe("IN_STOCK");
    expect(parseAvailability("maybe")).toBe("UNKNOWN");
    expect(parseAvailability(undefined)).toBe("UNKNOWN");
  });

  it("lets a preset override the heuristics (Ceneo dispatch days)", () => {
    const map = getPreset("ceneo-xml")!.availabilityMap;
    expect(parseAvailability("99", map)).toBe("UNKNOWN");
    expect(parseAvailability("3", map)).toBe("IN_STOCK");
  });
});

describe("feed layouts", () => {
  it("maps an Awin CSV row", () => {
    const csv = [
      "aw_deep_link,product_name,aw_product_id,search_price,currency,brand_name,ean,in_stock,rrp_price,delivery_cost,merchant_category",
      'https://www.awin1.com/pclick.php?p=1&a=2&m=3,"Example Brand Line Eau de Parfum 100 ml",1001,389.00,PLN,Example Brand,5901234123457,1,499.00,12.90,Perfumy',
    ].join("\n");
    const [record] = parseFeed(csv, "CSV");
    const offer = offerOf(record!, "awin-csv");
    expect(offer).toMatchObject({
      externalId: "1001", title: "Example Brand Line Eau de Parfum 100 ml", brand: "Example Brand", ean: "5901234123457",
      priceMinor: 38900, originalPriceMinor: 49900, currency: "PLN", availability: "IN_STOCK", shippingMinor: 1290,
    });
    expect(rawOfferSchema.safeParse(offer).success).toBe(true);
  });

  it("detects semicolon-delimited CSV", () => {
    const rows = parseFeed("id;title;price\n7;Something Eau de Toilette 50 ml;129,99", "CSV");
    expect(offerOf(rows[0]!, "generic-csv")).toMatchObject({ externalId: "7", priceMinor: 12999, currency: "PLN" });
  });

  it("maps a Google Shopping XML item, using the sale price as the current price", () => {
    const xml = `<?xml version="1.0"?><rss xmlns:g="http://base.google.com/ns/1.0"><channel>
      <item><g:id>A1</g:id><g:title>Example Brand Line EDT 100 ml</g:title><g:brand>Example Brand</g:brand><g:gtin>05901234123457</g:gtin>
        <g:price>120.00 EUR</g:price><g:sale_price>99.00 EUR</g:sale_price><g:availability>in_stock</g:availability>
        <g:link>https://shop.example/p/a1</g:link><g:shipping><g:price>4.95 EUR</g:price></g:shipping></item>
      <item><g:id>A2</g:id><g:title>Other 50 ml</g:title><g:price>50.00 EUR</g:price><g:availability>out of stock</g:availability><g:link>https://shop.example/p/a2</g:link></item>
    </channel></rss>`;
    const records = parseFeed(xml, "XML");
    expect(records).toHaveLength(2);
    expect(offerOf(records[0]!, "google-shopping-xml", { ...ctx, currency: "EUR" })).toMatchObject({
      externalId: "A1", priceMinor: 9900, originalPriceMinor: 12000, currency: "EUR", ean: "05901234123457", availability: "IN_STOCK", shippingMinor: 495,
    });
    expect(offerOf(records[1]!, "google-shopping-xml", { ...ctx, currency: "EUR" })).toMatchObject({ availability: "OUT_OF_STOCK", originalPriceMinor: undefined });
  });

  it("handles a single-item XML feed (no array)", () => {
    const xml = `<rss xmlns:g="x"><channel><item><g:id>1</g:id><g:title>Solo 30 ml</g:title><g:price>10.00 PLN</g:price><g:link>https://shop.example/1</g:link></item></channel></rss>`;
    expect(parseFeed(xml, "XML", { recordPath: "rss.channel.item" })).toHaveLength(1);
  });

  it("maps a Ceneo XML offer with attribute selectors", () => {
    const xml = `<offers><o id="55" url="https://shop.example/55" price="349.99" avail="1"><cat>Perfumy</cat><name>Example Brand Line EDP 50 ml</name>
      <imgs><main url="https://shop.example/55.jpg"/></imgs>
      <attrs><a name="Producent">Example Brand</a><a name="EAN">5901234123457</a></attrs></o>
      <o id="56" url="https://shop.example/56" price="99.00" avail="99"><name>Thing</name></o></offers>`;
    const records = parseFeed(xml, "XML", { recordPath: "offers.o" });
    expect(offerOf(records[0]!, "ceneo-xml")).toMatchObject({
      externalId: "55", brand: "Example Brand", ean: "5901234123457", priceMinor: 34999, currency: "PLN", availability: "IN_STOCK",
      url: "https://shop.example/55", imageUrl: "https://shop.example/55.jpg",
    });
    expect(offerOf(records[1]!, "ceneo-xml").availability).toBe("UNKNOWN");
  });

  it("explodes Shopify variants into one offer each and builds URLs", () => {
    const json = JSON.stringify({ products: [{ title: "Example Line EDP", handle: "example-line", vendor: "Example Brand", images: [{ src: "https://cdn.example/x.jpg" }],
      variants: [
        { id: 11, title: "50 ml", price: "300.00", compare_at_price: "350.00", barcode: "5901234123457", available: true },
        { id: 12, title: "100 ml", price: "450.00", compare_at_price: null, barcode: "", available: false },
      ] }] });
    const preset = getPreset("shopify-json")!;
    const records = parseFeed(json, "JSON", { recordPath: preset.recordPath, explode: preset.explode });
    expect(records).toHaveLength(2);
    expect(offerOf(records[0]!, "shopify-json")).toMatchObject({
      externalId: "11", title: "Example Line EDP 50 ml", priceMinor: 30000, originalPriceMinor: 35000, ean: "5901234123457",
      availability: "IN_STOCK", url: "https://shop.example/products/example-line?variant=11",
    });
    expect(offerOf(records[1]!, "shopify-json")).toMatchObject({ externalId: "12", title: "Example Line EDP 100 ml", ean: undefined, availability: "OUT_OF_STOCK" });
  });

  it("parses JSON Lines", () => {
    expect(parseFeed('{"id":"1"}\n\n{"id":"2"}\n', "JSONL")).toEqual([{ id: "1" }, { id: "2" }]);
  });

  it("applies include / exclude patterns", () => {
    const preset = getPreset("generic-csv")!;
    const row = { id: "1", title: "Krem do rąk 50 ml", price: "20", category: "Pielęgnacja" };
    expect(mapRecord(row, preset, { ...ctx, includePattern: "perfum|parfum|toilette" })).toEqual({ skipped: "filtered" });
    expect(mapRecord({ ...row, title: "X Eau de Parfum 50 ml TESTER" }, preset, { ...ctx, excludePattern: "tester" })).toEqual({ skipped: "filtered" });
  });

  it("produces offers the schema rejects when required data is missing", () => {
    const noPrice = offerOf({ id: "1", title: "No price EDP 50 ml", url: "https://shop.example/1" }, "generic-csv");
    expect(rawOfferSchema.safeParse(noPrice).success).toBe(false);
    const foreign = offerOf({ id: "2", title: "Foreign EDP 50 ml", price: "49.00 GBP", url: "https://shop.example/2" }, "generic-csv");
    expect(rawOfferSchema.safeParse(foreign).success).toBe(false);
    const noUrl = offerOf({ id: "3", title: "No link EDP 50 ml", price: "49.00" }, "generic-csv");
    expect(rawOfferSchema.safeParse(noUrl).success).toBe(false);
  });

  it("reads nested paths", () => {
    expect(getPath({ a: { b: [{ c: 1 }, { c: 2 }] } }, "a.b.1.c")).toBe(2);
    expect(getPath({ a: null }, "a.b")).toBeUndefined();
  });
});

describe("quality guards and scheduling", () => {
  it("aborts when a feed shrinks by more than half", () => {
    expect(feedShrankTooMuch(1000, 400)).toBe(true);
    expect(feedShrankTooMuch(1000, 600)).toBe(false);
    expect(feedShrankTooMuch(null, 3)).toBe(false);
    expect(feedShrankTooMuch(10, 1)).toBe(false); // too small a baseline to judge
  });

  it("schedules by interval with exponential back-off on failures", () => {
    const last = new Date("2026-11-15T00:00:00Z");
    const base = { enabled: true, lastRunAt: last, intervalMinutes: 60, consecutiveFailures: 0 };
    expect(nextRunAt(base).toISOString()).toBe("2026-11-15T01:00:00.000Z");
    expect(nextRunAt({ ...base, consecutiveFailures: 2 }).toISOString()).toBe("2026-11-15T04:00:00.000Z");
    expect(nextRunAt({ ...base, consecutiveFailures: 9 }).toISOString()).toBe("2026-11-15T08:00:00.000Z");
    expect(isDue(base, new Date("2026-11-15T00:59:00Z"))).toBe(false);
    expect(isDue(base, new Date("2026-11-15T01:00:00Z"))).toBe(true);
    expect(isDue({ ...base, lastRunAt: null }, last)).toBe(true);
    expect(isDue({ ...base, enabled: false }, new Date("2027-01-01T00:00:00Z"))).toBe(false);
  });

  it("classifies sources into data modes", () => {
    expect(modeOf("DEMO")).toBe("DEMO");
    expect(modeOf("AFFILIATE_FEED")).toBe("LIVE");
    expect(parseMode("live")).toBe("LIVE");
    expect(parseMode("real")).toBeNull();
  });
});
