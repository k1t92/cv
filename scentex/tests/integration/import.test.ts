import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { publicAdapter } from "@/engine/adapters/public";
import { runAdapter } from "@/engine/ingest";
import { recomputeAllStats, recomputeProductStats } from "@/engine/stats";
import type { RawOffer, RetailerAdapter } from "@/engine/types";
import { getHistory, getMarketSummary, getProduct, listMarket, parseMarketQuery } from "@/lib/queries";
import { FakeSite, at, counts, ean13, prisma, productPage, publicSource, resetDatabase } from "./helpers";

const A = ean13("590123412345");
const B = ean13("590123412346");
const C = ean13("590123412347");
const D = ean13("590123412348");
const pages = () => ({
  "/p/line-edp-100": productPage("Example House Line Eau de Parfum 100 ml", A, 400),
  "/p/line-edt-100": productPage("Example House Line Eau de Toilette 100 ml", B, 300),
  "/p/other-edp-50": productPage("Example House Other Eau de Parfum 50 ml", C, 250),
});

const replayAdapter = (retailerId: string): RetailerAdapter => ({
  key: "replay", partial: true,
  fetchOffers: async () => (await prisma.crawlPage.findMany({ where: { retailerId, isSitemap: false, status: "OK" } })).flatMap((p) => (p.lastOffers as unknown as RawOffer[] | null) ?? []),
});

beforeEach(async () => {
  await resetDatabase();
  await prisma.brand.create({ data: { slug: "example-house", name: "Example House" } });
});
afterAll(() => prisma.$disconnect());

describe("repeated imports", () => {
  it("never duplicates offers, and adds snapshots only when a new day or a new price warrants one", async () => {
    const retailer = await publicSource();
    const site = new FakeSite(pages());
    const run = (iso: string) => prisma.retailer.findUniqueOrThrow({ where: { id: retailer.id } }).then((r) => runAdapter(prisma, r, publicAdapter, at(iso), { http: site.http }));

    const first = await run("2026-11-16T10:00:00Z");
    expect(first).toMatchObject({ status: "SUCCEEDED", offersSeen: 3, offersRejected: 0, unmatched: 0 });
    expect(await counts()).toEqual({ offers: 3, snapshots: 3, changes: 0, products: 3 });

    // Same hour: nothing is due, so no product page is requested and nothing is written.
    site.log = [];
    await run("2026-11-16T11:00:00Z");
    expect(site.log.filter((u) => u.startsWith("/p/"))).toEqual([]);
    expect(await counts()).toEqual({ offers: 3, snapshots: 3, changes: 0, products: 3 });

    // Replaying the stored extractions (no requests at all) is a no-op too, however often it runs.
    for (let i = 0; i < 3; i++) await runAdapter(prisma, retailer, replayAdapter(retailer.id), at("2026-11-16T10:00:00Z"));
    expect(await counts()).toEqual({ offers: 3, snapshots: 3, changes: 0, products: 3 });

    // An observation older than what is stored can never rewrite it or move "last checked".
    const before = await prisma.retailerProduct.findMany({ orderBy: { id: "asc" }, select: { lastCheckedAt: true, priceMinor: true } });
    await runAdapter(prisma, retailer, replayAdapter(retailer.id), at("2026-11-15T09:00:00Z"));
    expect(await prisma.retailerProduct.findMany({ orderBy: { id: "asc" }, select: { lastCheckedAt: true, priceMinor: true } })).toEqual(before);
    expect(await counts()).toEqual({ offers: 3, snapshots: 3, changes: 0, products: 3 });

    // Next day, same prices: one heartbeat snapshot per offer, no price change, still three offers.
    await run("2026-11-17T12:00:00Z");
    expect(await counts()).toEqual({ offers: 3, snapshots: 6, changes: 0, products: 3 });

    // A real price move is recorded exactly once.
    site.routes.set("https://shop.example/p/line-edp-100", { body: productPage("Example House Line Eau de Parfum 100 ml", A, 360) });
    await run("2026-11-18T13:00:00Z");
    const after = await counts();
    expect(after).toMatchObject({ offers: 3, changes: 1, products: 3 });
    const change = await prisma.priceChange.findFirstOrThrow();
    expect(change).toMatchObject({ oldPriceMinor: 40000, newPriceMinor: 36000, deltaMinor: -4000 });
    expect(await prisma.retailerProduct.groupBy({ by: ["retailerId", "externalId"], _count: true }).then((g) => g.every((x) => x._count === 1))).toBe(true);
  });

  it("keeps concentrations apart and identifies every created product", async () => {
    const retailer = await publicSource();
    await runAdapter(prisma, retailer, publicAdapter, at("2026-11-16T10:00:00Z"), { http: new FakeSite(pages()).http });
    const products = await prisma.product.findMany({ orderBy: { slug: "asc" }, include: { brand: true } });
    expect(products.map((p) => [p.brand.name, p.name, p.concentration, p.volumeMl, p.ean])).toEqual([
      ["Example House", "Line", "EDP", 100, A], ["Example House", "Line", "EDT", 100, B], ["Example House", "Other", "EDP", 50, C],
    ]);
  });
});

describe("interrupted imports and source shutdown", () => {
  it("stops at an HTTP 403, keeps what was already confirmed, and switches the source off", async () => {
    const retailer = await publicSource();
    const site = new FakeSite({ ...pages(), "/p/zeta-edp-30": productPage("Example House Zeta Eau de Parfum 30 ml", D, 99) });
    site.routes.set("https://shop.example/p/other-edp-50", { status: 403, body: "Access Denied" });

    const summary = await runAdapter(prisma, retailer, publicAdapter, at("2026-11-16T10:00:00Z"), { http: site.http });
    expect(summary.status).toBe("PARTIAL");
    expect(summary.error).toMatch(/HTTP 403/);
    // Pages are requested in a stable order; the two before the refusal are stored, the one after is never requested.
    expect(site.log.filter((u) => u.startsWith("/p/"))).toEqual(["/p/line-edp-100", "/p/line-edt-100", "/p/other-edp-50"]);
    expect(await counts()).toMatchObject({ offers: 2, snapshots: 2 });

    const blocked = await prisma.retailer.findUniqueOrThrow({ where: { id: retailer.id } });
    expect(blocked).toMatchObject({ enabled: false, accessStatus: "RESTRICTED" });
    expect(blocked.blockedAt).not.toBeNull();
    expect(blocked.blockedReason).toMatch(/403/);

    // A later run makes no request whatsoever and leaves the stored offers untouched.
    site.log = [];
    const again = await runAdapter(prisma, blocked, publicAdapter, at("2026-11-17T10:00:00Z"), { http: site.http });
    expect(again.status).toBe("FAILED");
    expect(site.log).toEqual([]);
    expect(await counts()).toMatchObject({ offers: 2, snapshots: 2 });

    // Saved extractions can still be re-ingested offline without duplicating anything.
    await runAdapter(prisma, blocked, replayAdapter(retailer.id), at("2026-11-16T10:00:00Z"));
    expect(await counts()).toMatchObject({ offers: 2, snapshots: 2, changes: 0 });
  });

  it("switches off before collecting anything when robots.txt itself is refused or challenged", async () => {
    for (const [slug, canned] of [["a", { status: 403, body: "Access Denied" }], ["b", { status: 200, body: "<title>Just a moment...</title>", headers: { "cf-mitigated": "challenge" } }]] as const) {
      const retailer = await publicSource({ slug: `live-${slug}` });
      const site = new FakeSite(pages());
      site.routes.set("https://shop.example/robots.txt", canned);
      const summary = await runAdapter(prisma, retailer, publicAdapter, at("2026-11-16T10:00:00Z"), { http: site.http });
      expect(summary.status).toBe("FAILED");
      expect(site.log).toEqual(["/robots.txt"]);
      expect((await prisma.retailer.findUniqueOrThrow({ where: { id: retailer.id } })).enabled).toBe(false);
    }
    expect(await counts()).toMatchObject({ offers: 0 });
  });

  it("obeys robots.txt: disallowed pages are never requested, and Disallow: / stops the source", async () => {
    const retailer = await publicSource();
    const site = new FakeSite(pages());
    site.routes.set("https://shop.example/robots.txt", { body: "User-agent: *\nDisallow: /p/line-edt" });
    await runAdapter(prisma, retailer, publicAdapter, at("2026-11-16T10:00:00Z"), { http: site.http });
    expect(site.log).not.toContain("/p/line-edt-100");
    expect(await counts()).toMatchObject({ offers: 2 });

    const closed = await publicSource({ slug: "live-closed" });
    const closedSite = new FakeSite(pages());
    closedSite.routes.set("https://shop.example/robots.txt", { body: "User-agent: *\nDisallow: /" });
    expect((await runAdapter(prisma, closed, publicAdapter, at("2026-11-16T10:00:00Z"), { http: closedSite.http })).status).toBe("FAILED");
    expect(closedSite.log).toEqual(["/robots.txt"]);
  });

  it("refuses to run a source that did not pass the access audit", async () => {
    const retailer = await publicSource({ accessStatus: "RESTRICTED" });
    const site = new FakeSite(pages());
    expect((await runAdapter(prisma, retailer, publicAdapter, at("2026-11-16T10:00:00Z"), { http: site.http })).status).toBe("FAILED");
    expect(site.log).toEqual([]);
  });
});

describe("ambiguous matching goes to manual review", () => {
  it("does not link a listing whose barcode and wording disagree, or one without a size, or an untracked brand", async () => {
    const retailer = await publicSource();
    const brand = await prisma.brand.findFirstOrThrow();
    const existing = await prisma.product.create({ data: { slug: "example-house-line-edp-100ml", brandId: brand.id, name: "Line", concentration: "EDP", volumeMl: 100, ean: A } });
    const site = new FakeSite({
      "/p/conflict": productPage("Example House Line Eau de Parfum 50 ml", A, 200),          // barcode of the 100 ml, text says 50 ml
      "/p/no-size": productPage("Example House Line Eau de Parfum", B, 210),                  // no volume stated
      "/p/unknown-brand": productPage("Nobody Knows Eau de Parfum 100 ml", C, 220, "Nobody"), // brand not tracked
      "/p/bad-ean": productPage("Example House Mono Eau de Toilette 75 ml", "5901234123450", 230), // wrong check digit → no barcode → no auto-create
      "/p/clean": productPage("Example House Line Eau de Parfum 100 ml", A, 400),
    });
    const summary = await runAdapter(prisma, retailer, publicAdapter, at("2026-11-16T10:00:00Z"), { http: site.http });
    expect(summary).toMatchObject({ offersSeen: 5, unmatched: 4 });

    const listings = await prisma.retailerProduct.findMany({ orderBy: { url: "asc" } });
    expect(listings.map((l) => [l.url.split("/p/")[1], l.matchStatus, l.productId === existing.id])).toEqual([
      ["bad-ean", "PENDING_REVIEW", false], ["clean", "AUTO_EAN", true], ["conflict", "PENDING_REVIEW", false],
      ["no-size", "PENDING_REVIEW", false], ["unknown-brand", "PENDING_REVIEW", false],
    ]);
    expect(listings.find((l) => l.url.endsWith("bad-ean"))!.ean).toBeNull();
    expect(await prisma.product.count()).toBe(1); // nothing was created from a doubtful listing

    // Unreviewed listings take no part in any price shown to users.
    const product = await getProduct(existing.slug, "LIVE");
    expect(product!.offers.map((o) => o.priceMinor)).toEqual([40000]);
    expect(product!.stats[0]).toMatchObject({ lowestMinor: 40000, offersCount: 1 });
  });
});

describe("DEMO and LIVE never mix", () => {
  it("keeps offers, aggregates, lists and history separate per mode", async () => {
    const brand = await prisma.brand.findFirstOrThrow();
    const product = await prisma.product.create({ data: { slug: "example-house-line-edp-100ml", brandId: brand.id, name: "Line", concentration: "EDP", volumeMl: 100 } });
    const now = at("2026-11-16T12:00:00Z");
    const make = async (slug: string, sourceKind: "DEMO" | "STRUCTURED_DATA", price: number, extra: object = {}) => {
      const retailer = await prisma.retailer.create({ data: { slug, name: slug, country: "PL", currency: "PLN", websiteUrl: `https://${slug}.example`, sourceKind, adapterKey: "x", ...extra } });
      await prisma.retailerProduct.create({
        data: {
          retailerId: retailer.id, productId: product.id, externalId: "1", rawTitle: "t", url: `https://${slug}.example/1`, matchStatus: "MANUAL", currency: "PLN",
          priceMinor: price, availability: "IN_STOCK", lastCheckedAt: at("2026-11-16T11:00:00Z"),
          snapshots: { create: { priceMinor: price, availability: "IN_STOCK", checkedAt: at("2026-11-16T11:00:00Z") } },
        },
      });
      return retailer;
    };
    await make("demo-shop", "DEMO", 11100);
    await make("live-shop", "STRUCTURED_DATA", 45000);
    await make("live-paused", "STRUCTURED_DATA", 47000, { enabled: false, blockedAt: now, blockedReason: "403" });
    await make("live-hidden", "STRUCTURED_DATA", 100, { enabled: false }); // switched off by hand
    await recomputeProductStats(prisma, product.id, "DEMO", now);
    await recomputeProductStats(prisma, product.id, "LIVE", now);

    const live = await getProduct(product.slug, "LIVE");
    expect(live!.offers.map((o) => o.retailer.slug).sort()).toEqual(["live-paused", "live-shop"]);
    expect(live!.stats).toHaveLength(1);
    expect(live!.stats[0]).toMatchObject({ mode: "LIVE", lowestMinor: 45000, highestMinor: 47000, offersCount: 2 });

    const demo = await getProduct(product.slug, "DEMO");
    expect(demo!.offers.map((o) => o.retailer.slug)).toEqual(["demo-shop"]);
    expect(demo!.stats[0]).toMatchObject({ mode: "DEMO", lowestMinor: 11100, offersCount: 1 });

    const query = parseMarketQuery({});
    expect((await listMarket(query, 10, "LIVE")).rows.map((r) => r.lowestMinor)).toEqual([45000]);
    expect((await listMarket(query, 10, "DEMO")).rows.map((r) => r.lowestMinor)).toEqual([11100]);

    const liveHistory = await getHistory(product.slug, "ALL", "PLN", "LIVE", now);
    expect(liveHistory!.mode).toBe("LIVE");
    expect(liveHistory!.retailers.map((r) => r.name).sort()).toEqual(["live-paused", "live-shop"]);
    expect(liveHistory!.lowest.map((p) => p.v)).toEqual([45000]);
    const demoHistory = await getHistory(product.slug, "ALL", "PLN", "DEMO", now);
    expect(demoHistory!.retailers.map((r) => r.name)).toEqual(["demo-shop"]);
    expect(demoHistory!.lowest.map((p) => p.v)).toEqual([11100]);

    expect(await getMarketSummary("LIVE")).toMatchObject({ products: 1, retailers: 1 });
    expect(await getMarketSummary("DEMO")).toMatchObject({ products: 1, retailers: 1 });
  });

  it("stops advertising a live price as the lowest once it is stale", async () => {
    const brand = await prisma.brand.findFirstOrThrow();
    const product = await prisma.product.create({ data: { slug: "p", brandId: brand.id, name: "Line", concentration: "EDP", volumeMl: 100 } });
    const retailer = await prisma.retailer.create({ data: { slug: "live-shop", name: "Shop", country: "PL", currency: "PLN", websiteUrl: "https://s.example", sourceKind: "STRUCTURED_DATA", adapterKey: "x" } });
    await prisma.retailerProduct.create({
      data: { retailerId: retailer.id, productId: product.id, externalId: "1", rawTitle: "t", url: "https://s.example/1", matchStatus: "MANUAL", currency: "PLN", priceMinor: 30000, availability: "IN_STOCK", lastCheckedAt: at("2026-11-10T00:00:00Z") },
    });
    await recomputeAllStats(prisma, "LIVE", at("2026-11-11T00:00:00Z"));
    expect((await prisma.productStats.findFirstOrThrow()).lowestMinor).toBe(30000);
    await recomputeAllStats(prisma, "LIVE", at("2026-11-16T00:00:00Z"));
    expect(await prisma.productStats.findFirstOrThrow()).toMatchObject({ lowestMinor: null, inStockCount: 0, offersCount: 1 });
  });
});
