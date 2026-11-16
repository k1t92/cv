import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { DataTable, type Cell } from "@/components/DataTable";
import { PriceChart } from "@/components/PriceChart";
import { Badge, BottleGlyph, Change, Panel } from "@/components/ui";
import { getDictionary } from "@/i18n";
import { CONCENTRATION_LONG, formatDateTime, formatMoney, formatPct, timeAgo } from "@/lib/format";
import { convertMinor, discountPct } from "@/lib/money";
import { prisma } from "@/lib/db";
import { getFx } from "@/lib/fx";
import { isStale } from "@/lib/mode";
import { getCurrency, getMode } from "@/lib/prefs";
import { getPriceChanges, getProduct } from "@/lib/queries";

const loadProduct = cache(async (slug: string) => getProduct(slug, (await getMode()).mode));
type Params = { params: Promise<{ slug: string }> };

function fullName(p: { brand: { name: string }; name: string; concentration: string; volumeMl: number }) {
  return `${p.brand.name} ${p.name} ${CONCENTRATION_LONG[p.concentration]} ${p.volumeMl} ml`.replace(/\s+/g, " ");
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const product = await loadProduct((await params).slug);
  if (!product) return { title: "Not found" };
  const title = `${fullName(product)} — price history & best price`;
  const description = `Compare ${fullName(product)} prices across retailers and see how the price has moved over time.`;
  return { title, description, alternates: { canonical: `/perfumes/${product.slug}` }, openGraph: { title, description, type: "website" } };
}

export default async function ProductPage({ params }: Params) {
  const t = getDictionary().product;
  const product = await loadProduct((await params).slug);
  if (!product) notFound();
  const { mode } = await getMode();
  const [currency, { rate }, changes] = await Promise.all([getCurrency(), getFx(prisma), getPriceChanges(product.id, mode)]);
  const now = new Date();
  const stats = product.stats[0];
  const view = (minor: number | null | undefined, from: "PLN" | "EUR") => (minor == null ? null : convertMinor(minor, from, currency, rate));
  const money = (minor: number | null | undefined) => formatMoney(minor, currency);
  const isDemo = mode === "DEMO";

  const offers = product.offers
    .map((o) => {
      const price = view(o.priceMinor, o.currency)!;
      const shipping = view(o.shippingMinor, o.currency);
      // LIVE only: a price is "confirmed" while its source is being collected and the check is recent.
      const paused = !isDemo && o.retailer.blockedAt != null;
      const stale = !isDemo && isStale(o.lastCheckedAt, now);
      return { o, price, shipping, total: shipping == null ? null : price + shipping, inStock: o.availability === "IN_STOCK", paused, stale };
    })
    .sort((a, b) => Number(b.inStock && !b.stale) - Number(a.inStock && !a.stale) || a.price - b.price);
  const best = offers.find((x) => x.inStock && !x.stale);
  const confirmed = offers.filter((x) => x.inStock && !x.stale);

  const offerRows = offers.map(({ o, price, shipping, total, inStock, paused, stale }) => {
    const claimed = discountPct(o.priceMinor, o.originalPriceMinor);
    const cells: Record<string, Cell> = {
      retailer: { text: `${o.retailer.name} ${o.retailer.country}${best?.o.id === o.id ? "  ★ cheapest" : ""}`, strong: true, tone: best?.o.id === o.id ? "gold" : undefined },
      price: { text: money(price), sort: price, strong: true },
      was: { text: money(view(o.originalPriceMinor, o.currency)), sort: view(o.originalPriceMinor, o.currency) ?? 0, tone: "muted" },
      discount: { text: claimed == null ? "—" : `−${claimed.toFixed(0)}%`, sort: claimed ?? 0, tone: "muted" },
      shipping: { text: shipping == null ? "—" : shipping === 0 ? "Free" : money(shipping), sort: shipping ?? Number.MAX_SAFE_INTEGER, tone: "muted" },
      total: { text: money(total), sort: total ?? Number.MAX_SAFE_INTEGER },
      stock: { text: inStock ? "In stock" : o.availability === "OUT_OF_STOCK" ? "Out of stock" : "Unknown", tone: inStock ? undefined : "muted", sort: inStock ? 0 : 1 },
      checked: {
        text: `${formatDateTime(o.lastCheckedAt)} (${timeAgo(o.lastCheckedAt, now)})${stale ? " · STALE" : ""}${paused ? " · source paused" : ""}`,
        sort: -o.lastCheckedAt.getTime(), tone: stale || paused ? "rise" : "muted",
      },
      link: { text: isDemo ? "Store home" : "View offer", href: o.url },
    };
    return { key: o.id, cells, highlight: best?.o.id === o.id };
  });

  const changeRows = changes.map((c) => {
    const tone = c.deltaMinor < 0 ? "fall" : "rise";
    const cells: Record<string, Cell> = {
      date: { text: formatDateTime(c.detectedAt), sort: c.detectedAt.getTime(), tone: "muted" },
      retailer: { text: `${c.retailerProduct.retailer.name} ${c.retailerProduct.retailer.country}` },
      previous: { text: money(view(c.oldPriceMinor, c.currency)), sort: view(c.oldPriceMinor, c.currency)!, tone: "muted" },
      next: { text: money(view(c.newPriceMinor, c.currency)), sort: view(c.newPriceMinor, c.currency)! },
      change: { text: `${c.deltaMinor < 0 ? "▼ −" : "▲ +"}${money(Math.abs(view(c.deltaMinor, c.currency)!))}`, sort: view(c.deltaMinor, c.currency)!, tone },
      changePct: { text: formatPct(c.pctChange), sort: c.pctChange, tone },
    };
    return { key: String(c.id), cells };
  });

  // Offers are omitted from structured data while prices are synthetic: search engines must never see demo prices as real.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: fullName(product),
    brand: { "@type": "Brand", name: product.brand.name },
    category: "Fragrance",
    ...(product.ean ? { gtin: product.ean } : {}),
    ...(!isDemo && best && stats?.highestMinor != null
      ? { offers: { "@type": "AggregateOffer", priceCurrency: currency, lowPrice: (best.price / 100).toFixed(2), highPrice: (convertMinor(stats.highestMinor, "PLN", currency, rate) / 100).toFixed(2), offerCount: stats.inStockCount } }
      : {}),
  };

  const facts = [
    ["Brand", product.brand.name], ["Concentration", CONCENTRATION_LONG[product.concentration] ?? "—"], ["Volume", `${product.volumeMl} ml`],
    ["Category", product.category ?? "—"], ["Released", product.releaseYear ? String(product.releaseYear) : "—"], ["EAN / GTIN", product.ean ?? "—"],
  ];

  return (
    <div className="space-y-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <Link href="/" className="hover:text-ink">Market</Link> / <Link href="/perfumes" className="hover:text-ink">Perfumes</Link> /{" "}
        <Link href={`/perfumes?brand=${product.brand.slug}`} className="hover:text-ink">{product.brand.name}</Link>
      </nav>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-6 p-5">
          <div className="flex items-start gap-4">
            <BottleGlyph brand={product.brand.name} size={72} />
            <div>
              <p className="label">{product.brand.name}</p>
              <h1 className="mt-1 text-2xl font-medium tracking-tight">{product.name}</h1>
              <p className="mt-1 text-sm text-muted">{CONCENTRATION_LONG[product.concentration]} · {product.volumeMl} ml</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {isDemo ? <Badge tone="gold">Demo data · synthetic prices</Badge> : <Badge tone="fall">Live data</Badge>}
                {stats?.isAllTimeLow && <Badge tone="gold">{t.lowAll}</Badge>}
                {stats?.isLow30d && <Badge tone="fall">{t.low30}</Badge>}
              </div>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="label">{t.lowestNow}</p>
            <p className="num mt-1 text-3xl font-medium">{best ? money(best.price) : "—"}</p>
            <p className="mt-1 text-sm text-muted">
              {best ? <>at {best.o.retailer.name} {best.o.retailer.country} · checked {timeAgo(best.o.lastCheckedAt, now)}</> : offers.length ? t.outOfStock : t.noOffers}
            </p>
            <div className="mt-2 flex gap-4 text-xs sm:justify-end">
              <span><span className="text-faint">24h </span><Change value={stats?.change24hPct} /></span>
              <span><span className="text-faint">7d </span><Change value={stats?.change7dPct} /></span>
              <span><span className="text-faint">30d </span><Change value={stats?.change30dPct} /></span>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          {facts.map(([label, value]) => (
            <div key={label} className="bg-panel px-4 py-3"><dt className="label">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>
          ))}
        </dl>
      </Panel>

      <Panel title={t.chart} hint="Lowest in-stock price across retailers. Each line is a step: a price holds until the next recorded observation.">
        <PriceChart slug={product.slug} currency={currency} mode={mode} />
      </Panel>

      <Panel title={t.offers} hint={`${confirmed.length} confirmed in-stock offer${confirmed.length === 1 ? "" : "s"} from ${new Set(confirmed.map((x) => x.o.retailerId)).size} store${new Set(confirmed.map((x) => x.o.retailerId)).size === 1 ? "" : "s"} (${offers.length} listed) · “Claimed discount” is the store’s own struck-through price, not a verified drop.`}>
        <DataTable
          emptyLabel={t.noOffers}
          initialSort={{ id: "stock", dir: "asc" }}
          filter={{ columnId: "stock", allLabel: "All availability" }}
          pageSize={20}
          rows={offerRows}
          columns={[
            { id: "retailer", label: t.retailer }, { id: "price", label: t.price, align: "right", numeric: true },
            { id: "was", label: t.was, align: "right", numeric: true }, { id: "discount", label: t.discount, align: "right", numeric: true },
            { id: "shipping", label: t.shipping, align: "right", numeric: true }, { id: "total", label: t.total, align: "right", numeric: true },
            { id: "stock", label: t.stock }, { id: "checked", label: t.checked }, { id: "link", label: t.link },
          ]}
        />
      </Panel>

      <Panel title={t.history} hint={changes.length === 200 ? "Showing the 200 most recent changes." : undefined}>
        <DataTable
          emptyLabel={t.noHistory}
          initialSort={{ id: "date", dir: "desc" }}
          filter={{ columnId: "retailer", allLabel: "All retailers" }}
          rows={changeRows}
          columns={[
            { id: "date", label: t.date }, { id: "retailer", label: t.retailer },
            { id: "previous", label: t.previous, align: "right", numeric: true }, { id: "next", label: t.next, align: "right", numeric: true },
            { id: "change", label: t.change, align: "right", numeric: true }, { id: "changePct", label: t.changePct, align: "right", numeric: true },
          ]}
        />
      </Panel>
    </div>
  );
}
