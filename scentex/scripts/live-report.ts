/**
 * `npm run report:live` — print LIVE_DATA_REPORT.md content from the database.
 * Every number is a query result; nothing is typed in by hand.
 */
import { prisma } from "../src/lib/db";

const live = { sourceKind: { not: "DEMO" as const } };
const iso = (d: Date | null) => (d ? d.toISOString().replace(".000Z", "Z").replace(/\.\d{3}Z$/, "Z") : "—");
const pln = (minor: number, currency: string) => `${(minor / 100).toFixed(2)} ${currency}`;

async function main() {
  const offers = await prisma.retailerProduct.findMany({
    where: { retailer: live },
    include: { retailer: true, product: { include: { brand: true } } },
    orderBy: [{ retailer: { slug: "asc" } }, { rawTitle: "asc" }],
  });
  const matched = offers.filter((o) => o.productId && o.matchStatus !== "PENDING_REVIEW" && o.matchStatus !== "REJECTED");
  const by = (status: string) => offers.filter((o) => o.matchStatus === status).length;
  const productIds = new Set(matched.map((o) => o.productId!));
  const perProduct = new Map<string, Set<string>>();
  for (const o of matched) perProduct.set(o.productId!, (perProduct.get(o.productId!) ?? new Set()).add(o.retailerId));
  const multiStore = [...perProduct.values()].filter((s) => s.size > 1).length;

  const ids = offers.map((o) => o.id);
  const [snapshots, changes, dupOffers, dupSnapshots, jobs, pages, sources, demoInLive, fx] = await Promise.all([
    prisma.priceSnapshot.count({ where: { retailerProductId: { in: ids } } }),
    prisma.priceChange.count({ where: { retailerProductId: { in: ids } } }),
    prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) n FROM (SELECT 1 FROM "RetailerProduct" GROUP BY "retailerId","externalId" HAVING count(*) > 1) x`,
    prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) n FROM (SELECT 1 FROM "PriceSnapshot" GROUP BY "retailerProductId","checkedAt" HAVING count(*) > 1) x`,
    prisma.scraperJob.aggregate({ where: { retailer: live }, _sum: { offersRejected: true }, _count: true }),
    prisma.crawlPage.groupBy({ by: ["retailerId", "status"], where: { isSitemap: false }, _count: true }),
    prisma.retailer.findMany({ where: live, orderBy: [{ enabled: "desc" }, { slug: "asc" }] }),
    prisma.productStats.count({ where: { mode: "LIVE", cheapestRetailer: { sourceKind: "DEMO" } } }),
    prisma.exchangeRate.findFirst({ orderBy: { effectiveDate: "desc" } }),
  ]);
  const eanValid = offers.filter((o) => o.ean).length;
  const identified = matched.filter((o) => o.product && o.product.brand && o.product.name && o.product.concentration && o.product.volumeMl > 0).length;
  const inStock = matched.filter((o) => o.availability === "IN_STOCK").length;

  const out: string[] = [];
  const row = (...cells: (string | number)[]) => out.push(`| ${cells.join(" | ")} |`);
  out.push("## Totals (queried from the database)", "");
  row("Metric", "Value");
  row("---", "---");
  row("Unique products with at least one matched live offer", productIds.size);
  row("Products offered by two or more live stores", multiStore);
  row("Unique live offers (listings)", offers.length);
  row("— matched to a product", matched.length);
  row("— of those in stock", inStock);
  row("Price snapshots stored for live offers", snapshots);
  row("Price changes recorded for live offers", changes);
  row("Offers matched by EAN / GTIN", by("AUTO_EAN"));
  row("Offers matched by normalised brand + name + concentration + volume", by("AUTO_ATTRIBUTES"));
  row("Offers matched manually", by("MANUAL"));
  row("Offers in manual review (excluded from all prices)", by("PENDING_REVIEW"));
  row("Offers rejected by a reviewer", by("REJECTED"));
  row("Offers rejected as invalid by schema / currency / plausibility checks (all runs)", jobs._sum.offersRejected ?? 0);
  row("Live offers carrying a barcode with a valid check digit", `${eanValid} of ${offers.length}`);
  row("Matched offers whose product has brand, name, concentration and volume", `${identified} of ${matched.length}`);
  row("Duplicate listing keys (retailer + listing id) in the database", Number(dupOffers[0]!.n));
  row("Duplicate snapshots (same offer, same timestamp) in the database", Number(dupSnapshots[0]!.n));
  row("LIVE aggregates pointing at a DEMO retailer", demoInLive);
  row("Import runs recorded for live sources", jobs._count);
  if (fx) row("EUR/PLN reference rate in use", `${fx.rate} (${fx.source}, ${iso(fx.effectiveDate).slice(0, 10)})`);

  out.push("", "## Sources", "");
  row("Source", "Host", "State", "Access status", "Offers", "Pages by extraction status", "Last price check");
  row("---", "---", "---", "---", "---", "---", "---");
  for (const s of sources) {
    const mine = offers.filter((o) => o.retailerId === s.id);
    const last = mine.reduce<Date | null>((acc, o) => (!acc || o.lastCheckedAt > acc ? o.lastCheckedAt : acc), null);
    const stats = pages.filter((p) => p.retailerId === s.id).map((p) => `${p.status} ${p._count}`).sort().join(", ") || "—";
    row(s.slug, new URL(s.websiteUrl).host, s.enabled ? "collecting" : s.blockedAt ? `paused ${iso(s.blockedAt)}` : "not collected", s.accessStatus, mine.length, stats, iso(last));
  }

  out.push("", "## Every live offer", "", "Timestamps are the moment the page was fetched (UTC). Prices are as published by the store.", "");
  row("Source", "Listing title (as published)", "EAN", "Price", "Stock", "Match", "Product", "Checked (UTC)", "URL");
  row("---", "---", "---", "---", "---", "---", "---", "---", "---");
  for (const o of offers) {
    const product = o.product ? `${o.product.brand.name} · ${o.product.name} · ${o.product.concentration} · ${o.product.volumeMl} ml` : "— (manual review)";
    row(new URL(o.retailer.websiteUrl).host.replace("www.", ""), o.rawTitle.replace(/\|/g, "/"), o.ean ?? "—", pln(o.priceMinor, o.currency), o.availability, o.matchStatus, product, iso(o.lastCheckedAt), o.url);
  }
  console.log(out.join("\n"));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
