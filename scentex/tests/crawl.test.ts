import { describe, expect, it } from "vitest";
import { brandPrefixes, wantsUrl } from "@/engine/adapters/public";
import { extractProduct, inlineVariantNames, jsonLdNodes, looksLikeChallenge } from "@/engine/crawl/extract";
import { disallowsEverything, isAllowed, parseRobots, rulesFor } from "@/engine/crawl/robots";
import { parseSitemap } from "@/engine/crawl/sitemap";
import { STORE_PROFILES } from "@/engine/crawl/stores";
import { deriveLineName, matchProduct, parseTitle } from "@/engine/matching";

// All fixtures below are synthetic, written to mirror markup shapes seen in the audit. No retailer content is stored in the repo.
const page = (jsonLd: unknown, extra = "") =>
  `<html><head>${extra}<script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head><body></body></html>`;
const opts = { currency: "PLN" as const, knownBrands: ["Example House", "Other Brand"] };
const URL_ = "https://shop.example/p/line-edp-100";

describe("robots.txt", () => {
  const robots = parseRobots(`
# comment
Sitemap: https://shop.example/sitemap.xml
User-agent: badbot
Disallow: /

User-agent: *
Allow: /
Disallow: /cart/
Disallow: /checkout
Disallow: /*?*sort_by=*
Disallow: /*.json$
Disallow: /collections/*+*
Allow: /cart/shared
Crawl-delay: 4

User-agent: bingbot
User-agent: yandexbot
Crawl-delay: 10
Disallow: /search
`);

  it("reads sitemaps and groups, including shared multi-agent groups", () => {
    expect(robots.sitemaps).toEqual(["https://shop.example/sitemap.xml"]);
    expect(rulesFor(robots, "bingbot").crawlDelaySeconds).toBe(10);
    expect(rulesFor(robots, "yandexbot").disallow).toEqual(["/search"]);
  });

  it("falls back to the * group for an unnamed bot and honours Crawl-delay", () => {
    const rules = rulesFor(robots, "scentex-bot");
    expect(rules.crawlDelaySeconds).toBe(4);
    expect(isAllowed(rules, "/products/line-edp-100")).toBe(true);
    expect(isAllowed(rules, "/checkout")).toBe(false);
    expect(isAllowed(rules, "/checkout/step2")).toBe(false);
  });

  it("supports wildcards, end anchors and longest-match precedence", () => {
    const rules = rulesFor(robots, "scentex-bot");
    expect(isAllowed(rules, "/products.json")).toBe(false);
    expect(isAllowed(rules, "/products.json?limit=3")).toBe(true); // "$" anchors the end
    expect(isAllowed(rules, "/collections/all?sort_by=price")).toBe(false);
    expect(isAllowed(rules, "/collections/a+b")).toBe(false);
    expect(isAllowed(rules, "/cart/x")).toBe(false);
    expect(isAllowed(rules, "/cart/shared")).toBe(true); // longer Allow beats shorter Disallow
  });

  it("uses a bot's own group when the site names it", () => {
    const own = parseRobots("User-agent: *\nAllow: /\n\nUser-agent: scentex-bot\nDisallow: /");
    expect(disallowsEverything(rulesFor(own, "scentex-bot"))).toBe(true);
    expect(disallowsEverything(rulesFor(robots, "badbot"))).toBe(true);
    expect(disallowsEverything(rulesFor(robots, "scentex-bot"))).toBe(false);
  });

  it("treats an empty or rule-less file as allow-all", () => {
    expect(isAllowed(rulesFor(parseRobots(""), "scentex-bot"), "/anything")).toBe(true);
    expect(isAllowed(rulesFor(parseRobots("User-agent: *\nDisallow:"), "scentex-bot"), "/anything")).toBe(true);
  });
});

describe("sitemaps", () => {
  it("parses an index and a urlset, dropping non-web locations", () => {
    const index = parseSitemap(`<?xml version="1.0"?><sitemapindex><sitemap><loc>https://shop.example/sitemap_products_1.xml?from=1&amp;to=2</loc><lastmod>2026-11-15T10:00:00+01:00</lastmod></sitemap><sitemap><loc>https://shop.example/sitemap_pages.xml</loc></sitemap></sitemapindex>`);
    expect(index.sitemaps.map((s) => s.loc)).toEqual(["https://shop.example/sitemap_products_1.xml?from=1&to=2", "https://shop.example/sitemap_pages.xml"]);
    expect(index.sitemaps[0]!.lastmod?.toISOString()).toBe("2026-11-15T09:00:00.000Z");
    const set = parseSitemap(`<urlset><url><loc>https://shop.example/a</loc></url><url><loc>javascript:alert(1)</loc></url><url><loc> https://shop.example/b </loc><lastmod>nonsense</lastmod></url></urlset>`);
    expect(set.urls).toEqual([{ loc: "https://shop.example/a", lastmod: null }, { loc: "https://shop.example/b", lastmod: null }]);
  });

  it("handles a single-entry urlset", () => {
    expect(parseSitemap("<urlset><url><loc>https://shop.example/only</loc></url></urlset>").urls).toHaveLength(1);
  });
});

describe("URL selection", () => {
  const perfumeria = STORE_PROFILES.find((p) => p.slug === "live-perfumeria-pl")!.crawl!;
  const eglamour = STORE_PROFILES.find((p) => p.slug === "live-e-glamour-pl")!.crawl!;
  const prefixes = brandPrefixes(["Dior", "Chanel", "Giorgio Armani", "Yves Saint Laurent"]);

  it("requests only fragrance pages of tracked brands on the source's own origin", () => {
    const want = (path: string) => wantsUrl(`https://www.perfumeria.pl${path}`, "https://www.perfumeria.pl", perfumeria, prefixes);
    expect(want("/products/chanel-bleu-de-chanel-woda-perfumowana-spray")).toBe(true);
    expect(want("/products/christian-dior-sauvage-woda-toaletowa")).toBe(true);
    expect(want("/products/ysl-libre-woda-perfumowana")).toBe(true);
    expect(want("/products/chanel-bleu-de-chanel-dezodorant-spray")).toBe(false);
    expect(want("/products/chanel-allure-homme-sport-woda-toaletowa-refill")).toBe(false);
    expect(want("/products/dior-sauvage-zestaw-woda-toaletowa")).toBe(false);
    expect(want("/products/adidas-get-ready-woda-toaletowa-spray")).toBe(false); // untracked brand
    expect(want("/collections/perfumy")).toBe(false);
    expect(wantsUrl("https://evil.example/products/chanel-x-woda-perfumowana", "https://www.perfumeria.pl", perfumeria, prefixes)).toBe(false);
  });

  it("applies each store's own path shape", () => {
    const want = (path: string) => wantsUrl(`https://www.e-glamour.pl${path}`, "https://www.e-glamour.pl", eglamour, prefixes);
    expect(want("/giorgio-armani-acqua-di-gio-pour-homme-woda-toaletowa-dla-mezczyzn-100-ml_z301/")).toBe(true);
    expect(want("/chanel-chance-edt-100-ml-w_z378/")).toBe(true);
    expect(want("/dior-sauvage-dezodorant-150-ml_z999/")).toBe(false);
    expect(want("/blog/dior-woda-perfumowana/")).toBe(false);
  });

  it("only two audited sources carry a crawl configuration, and none below 2 s between requests", () => {
    const active = STORE_PROFILES.filter((p) => p.crawl);
    expect(active.map((p) => p.slug)).toEqual(["live-perfumeria-pl", "live-e-glamour-pl"]);
    expect(active.every((p) => p.accessStatus === "PUBLIC_ACCESS_SUPPORTED" && p.crawl!.minDelayMs >= 2000)).toBe(true);
    expect(STORE_PROFILES.filter((p) => !p.crawl).every((p) => p.accessStatus !== "PUBLIC_ACCESS_SUPPORTED")).toBe(true);
  });
});

describe("structured-data extraction", () => {
  const product = (overrides: Record<string, unknown> = {}) => ({
    "@context": "https://schema.org/", "@type": "Product", name: "Example House Line Eau de Parfum 100 ml", sku: "S-1", gtin13: "5901234123457",
    brand: { "@type": "Brand", name: "Example House" }, image: ["https://shop.example/i.jpg"],
    offers: { "@type": "Offer", price: 244, priceCurrency: "PLN", availability: "https://schema.org/InStock" },
    ...overrides,
  });

  it("extracts a single-offer product", () => {
    const result = extractProduct(page(product()), URL_, opts);
    expect(result.status).toBe("OK");
    expect(result.offers).toEqual([{
      externalId: "5901234123457", title: "Example House Line Eau de Parfum 100 ml", brand: "Example House", ean: "5901234123457",
      priceMinor: 24400, originalPriceMinor: undefined, currency: "PLN", availability: "IN_STOCK", url: URL_, imageUrl: "https://shop.example/i.jpg",
    }]);
  });

  it("accepts numeric GTINs, string prices, offer arrays and @graph wrappers", () => {
    const node = product({ gtin13: undefined, offers: [{ "@type": "Offer", sku: "V1", gtin13: 5901234123457, price: "34,00", priceCurrency: "PLN", availability: "http://schema.org/OutOfStock", url: "/p/x?variant=1" }] });
    const result = extractProduct(page({ "@graph": [{ "@type": "Organization" }, node] }), URL_, opts);
    expect(result.offers[0]).toMatchObject({ externalId: "V1", ean: "5901234123457", priceMinor: 3400, availability: "OUT_OF_STOCK", url: "https://shop.example/p/x?variant=1" });
  });

  it("keeps variants apart and adds the variant name to the title", () => {
    const node = product({ name: "Example House Line Eau de Parfum", gtin13: undefined, offers: [
      { "@type": "Offer", name: "50 ml", sku: "A", gtin13: "5901234123457", price: 300, priceCurrency: "PLN" },
      { "@type": "Offer", name: "100 ml", sku: "B", gtin13: "5901234123464", price: 450, priceCurrency: "PLN" },
    ] });
    const result = extractProduct(page(node), URL_, opts);
    expect(result.offers.map((o) => [o.title, o.priceMinor, o.ean])).toEqual([
      ["Example House Line Eau de Parfum 50 ml", 30000, "5901234123457"], ["Example House Line Eau de Parfum 100 ml", 45000, "5901234123464"],
    ]);
  });

  it("takes the brand from the title only when markup has none and the brand is known", () => {
    expect(extractProduct(page(product({ brand: undefined })), URL_, opts).offers[0]!.brand).toBe("Example House");
    expect(extractProduct(page(product({ brand: undefined, name: "Mystery Line Eau de Parfum 50 ml" })), URL_, opts).offers[0]!.brand).toBeUndefined();
  });

  it("reads a structured 'was' price but never invents one", () => {
    const withList = product({ offers: { "@type": "Offer", price: 200, priceCurrency: "PLN", priceSpecification: [{ "@type": "UnitPriceSpecification", priceType: "https://schema.org/StrikethroughPrice", price: 260 }] } });
    expect(extractProduct(page(withList), URL_, opts).offers[0]!.originalPriceMinor).toBe(26000);
    expect(extractProduct(page(product()), URL_, opts).offers[0]!.originalPriceMinor).toBeUndefined();
  });

  it("reports a status instead of a price when the data is missing or ambiguous", () => {
    expect(extractProduct("<html><body>hello</body></html>", URL_, opts).status).toBe("NO_PRODUCT");
    expect(extractProduct(page(product({ offers: undefined })), URL_, opts).status).toBe("NO_PRICE");
    expect(extractProduct(page(product({ offers: { "@type": "Offer", priceCurrency: "PLN" } })), URL_, opts).status).toBe("NO_PRICE");
    expect(extractProduct(page(product({ offers: { "@type": "Offer", price: 0, priceCurrency: "PLN" } })), URL_, opts).status).toBe("NO_PRICE");
    expect(extractProduct(page(product({ offers: { "@type": "AggregateOffer", lowPrice: 100, highPrice: 300, priceCurrency: "PLN" } })), URL_, opts).status).toBe("AMBIGUOUS_PRICE");
    expect(extractProduct(page(product({ offers: [{ "@type": "Offer", price: 1, priceCurrency: "PLN" }, { "@type": "Offer", price: 2, priceCurrency: "PLN" }] })), URL_, opts).status).toBe("AMBIGUOUS_PRICE");
    expect(extractProduct(page([product(), product({ name: "Other Brand Thing Eau de Toilette 50 ml" })]), URL_, opts).status).toBe("AMBIGUOUS_PRICE");
    expect(extractProduct(page(product({ offers: { "@type": "Offer", price: 60, priceCurrency: "USD" } })), URL_, opts).status).toBe("UNSUPPORTED_CURRENCY");
    expect(extractProduct(page(product({ name: "Example House Body Lotion 200 ml" })), URL_, opts).status).toBe("NOT_FRAGRANCE");
    for (const status of ["NO_PRICE", "AMBIGUOUS_PRICE"] as const) expect(status).not.toBe("OK");
  });

  it("never reads reviews or reviewer names", () => {
    const withReviews = product({ review: [{ "@type": "Review", author: { "@type": "Person", name: "Jan Kowalski" }, description: "Super" }], aggregateRating: { ratingValue: 5 } });
    expect(JSON.stringify(extractProduct(page(withReviews), URL_, opts))).not.toMatch(/Kowalski|Super|rating/i);
  });

  it("skips malformed JSON-LD blocks without failing the page", () => {
    const html = `<script type="application/ld+json">{ not json </script>` + page(product());
    expect(jsonLdNodes(html)).toHaveLength(1);
    expect(extractProduct(html, URL_, opts).status).toBe("OK");
  });

  it("falls back to Open Graph product metadata, requiring an explicit currency", () => {
    const meta = `<meta property="og:type" content="product"><meta property="og:title" content="Example House Line Eau de Toilette 50 ml"><meta property="product:price:amount" content="199,99">`;
    expect(extractProduct(`<html><head>${meta}</head></html>`, URL_, opts)).toMatchObject({ status: "NO_PRICE", method: "meta" });
    const ok = extractProduct(`<html><head>${meta}<meta property="product:price:currency" content="PLN"></head></html>`, URL_, opts);
    expect(ok).toMatchObject({ status: "OK", method: "meta" });
    expect(ok.offers[0]).toMatchObject({ priceMinor: 19999, currency: "PLN", availability: "UNKNOWN", brand: "Example House" });
  });

  it("recognises anti-bot interstitials", () => {
    expect(looksLikeChallenge(403, "<html><title>Just a moment...</title></html>", {})).toBe(true);
    expect(looksLikeChallenge(403, "<h1>Access Denied</h1>", {})).toBe(true);
    expect(looksLikeChallenge(200, "<html>ok</html>", { "cf-mitigated": "challenge" })).toBe(true);
    expect(looksLikeChallenge(200, page({ "@type": "Product" }) + "x".repeat(30_000), {})).toBe(false);
    expect(looksLikeChallenge(404, null, {})).toBe(false);
  });
});

describe("live listing → catalogue", () => {
  it("derives a clean line name from Polish and English titles", () => {
    expect(deriveLineName("Giorgio Armani Acqua di Giò Pour Homme Woda toaletowa dla mężczyzn 100 ml", "Giorgio Armani")).toBe("Acqua di Giò Pour Homme");
    expect(deriveLineName("Chanel Bleu de Chanel woda perfumowana spray 100ml", "Chanel")).toBe("Bleu de Chanel");
    expect(deriveLineName("DIOR Sauvage Eau de Parfum 60 ml", "Dior")).toBe("Sauvage");
    expect(deriveLineName("Dior Sauvage Parfum 100 ml", "Dior")).toBe("Sauvage");
    expect(deriveLineName("Dior Fahrenheit Le Parfum woda perfumowana spray 75ml", "Dior")).toBe("Fahrenheit Le Parfum");
    expect(deriveLineName("Chanel Chance EDT 100 ml W", "Chanel")).toBe("Chance");
  });

  // Regressions found in the first real import: these pairs are different fragrances.
  it("keeps name-bearing words that look like descriptors", () => {
    const key = (title: string, brand: string) => parseTitle(title, brand).nameKey;
    expect(key("Tom Ford Noir woda perfumowana spray 50ml", "Tom Ford")).toBe("noir");
    expect(key("Tom Ford Noir Pour Femme woda perfumowana spray 50ml", "Tom Ford")).toBe("noir pour femme");
    expect(key("Yves Saint Laurent La Nuit de l'Homme Le Parfum woda perfumowana spray 60ml", "Yves Saint Laurent")).toBe("la nuit de l homme le parfum");
    expect(key("Yves Saint Laurent La Nuit de l'Homme woda toaletowa spray 60ml", "Yves Saint Laurent")).toBe("la nuit de l homme");
    expect(parseTitle("Dior Fahrenheit Le Parfum woda perfumowana spray 75ml", "Dior")).toMatchObject({ concentration: "EDP", volumeMl: 75, nameKey: "fahrenheit le parfum" });
    expect(parseTitle("Dior Sauvage Parfum 100 ml", "Dior")).toMatchObject({ concentration: "PARFUM", nameKey: "sauvage" });
  });

  it("does not merge 'Noir' with 'Noir Pour Femme', nor a flanker with its base line", () => {
    const catalogue = [
      { id: "noir-femme", ean: "888066034623", brandName: "Tom Ford", name: "Noir Pour Femme", concentration: "EDP" as const, volumeMl: 50 },
      { id: "nuit-parfum", ean: null, brandName: "Yves Saint Laurent", name: "La Nuit de l'Homme Le Parfum", concentration: "EDP" as const, volumeMl: 60 },
      { id: "lemale-parfum", ean: null, brandName: "Jean Paul Gaultier", name: "Le Male Le Parfum", concentration: "EDP" as const, volumeMl: 125 },
    ];
    expect(matchProduct({ title: "Tom Ford Noir woda perfumowana spray 50ml", brand: "Tom Ford" }, catalogue).productId).toBeNull();
    expect(matchProduct({ title: "Tom Ford Noir Pour Femme woda perfumowana spray 50ml", brand: "Tom Ford" }, catalogue).productId).toBe("noir-femme");
    expect(matchProduct({ title: "Yves Saint Laurent La Nuit de l'Homme woda perfumowana 60ml", brand: "Yves Saint Laurent" }, catalogue).productId).toBeNull();
    expect(matchProduct({ title: "Yves Saint Laurent La Nuit de l'Homme Le Parfum woda perfumowana 60ml", brand: "Yves Saint Laurent" }, catalogue).productId).toBe("nuit-parfum");
    expect(matchProduct({ title: "Jean Paul Gaultier Le Male Le Parfum Eau de Parfum 125 ml", brand: "Jean Paul Gaultier" }, catalogue).productId).toBe("lemale-parfum");
  });

  it("matches a Polish retailer title to the catalogue without merging concentrations", () => {
    const catalogue = [
      { id: "edt", ean: null, brandName: "Giorgio Armani", name: "Acqua di Giò Pour Homme", concentration: "EDT" as const, volumeMl: 100 },
      { id: "edp", ean: null, brandName: "Giorgio Armani", name: "Acqua di Giò Pour Homme", concentration: "EDP" as const, volumeMl: 100 },
    ];
    expect(matchProduct({ title: "Giorgio Armani Acqua di Giò Pour Homme Woda toaletowa dla mężczyzn 100 ml", brand: "Giorgio Armani" }, catalogue).productId).toBe("edt");
    expect(matchProduct({ title: "Giorgio Armani Acqua di Gio Pour Homme woda perfumowana spray 100ml", brand: "Giorgio Armani" }, catalogue).productId).toBe("edp");
    expect(matchProduct({ title: "Giorgio Armani Acqua di Giò Pour Homme Woda toaletowa 200 ml", brand: "Giorgio Armani" }, catalogue).productId).toBeNull();
  });
});

describe("variant sizes and non-retail units", () => {
  const meta = `<script>var meta = {"product":{"id":1,"variants":[{"id":11,"price":38000,"name":"Chance woda perfumowana - 35ml","public_title":"35ml","sku":"3145891264302"},{"id":12,"price":56803,"name":"Chance woda perfumowana - 50ml","public_title":"50ml","sku":"3145891264203"}]},"page":{}};</script>`;
  const node = { "@type": "Product", name: "Chance woda perfumowana", brand: { "@type": "Brand", name: "Chanel" }, offers: [
    { "@type": "Offer", sku: "3145891264302", gtin13: 3145891264302, price: 380, priceCurrency: "PLN" },
    { "@type": "Offer", sku: "3145891264203", gtin13: 3145891264203, price: 568.03, priceCurrency: "PLN" },
  ] };

  it("adds the size from inline storefront data when offers are unnamed", () => {
    expect(inlineVariantNames(meta).get("3145891264203")).toBe("50ml");
    const without = extractProduct(page(node), URL_, { currency: "PLN" });
    expect(without.offers.map((o) => o.title)).toEqual(["Chanel Chance woda perfumowana", "Chanel Chance woda perfumowana"]);
    const withSizes = extractProduct(page(node, meta), URL_, { currency: "PLN", inlineVariants: true });
    expect(withSizes.offers.map((o) => [o.title, o.priceMinor])).toEqual([["Chanel Chance woda perfumowana 35ml", 38000], ["Chanel Chance woda perfumowana 50ml", 56803]]);
  });

  it("ignores malformed inline data", () => {
    expect(inlineVariantNames(`var meta = {"product":{"variants":[{"sku": oops ]}};`).size).toBe(0);
    expect(inlineVariantNames("<html></html>").size).toBe(0);
  });

  it("drops testers and unboxed stock", () => {
    const unboxed = { ...node, name: "Higher Energy woda toaletowa spray 100ml - produkt bez opakowania", offers: { "@type": "Offer", sku: "x", price: 347.61, priceCurrency: "PLN" } };
    expect(extractProduct(page(unboxed), URL_, { currency: "PLN", titleExclude: "tester|bez opakowania" }).status).toBe("NOT_FRAGRANCE");
    expect(extractProduct(page(unboxed), URL_, { currency: "PLN" }).status).toBe("OK");
  });
});
