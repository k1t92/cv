import Link from "next/link";
import { MarketTable } from "@/components/MarketTable";
import { Badge, BottleGlyph, Change, Empty, Panel } from "@/components/ui";
import { getDictionary } from "@/i18n";
import { CONCENTRATION_LABEL, formatMoney, timeAgo } from "@/lib/format";
import { convertMinor, type CurrencyCode } from "@/lib/money";
import { prisma } from "@/lib/db";
import { getFx } from "@/lib/fx";
import { getCurrency, getMode } from "@/lib/prefs";
import {
  getBrandMoves, getFeatured, getMarketSummary, getMovers, getNewLows, getRecentChanges, listBrands, listMarket,
  parseMarketQuery, type StatsRow,
} from "@/lib/queries";

function ProductRow({ row, currency, rate, value }: { row: StatsRow; currency: CurrencyCode; rate: number; value: number | null }) {
  const p = row.product;
  return (
    <li>
      <Link href={`/perfumes/${p.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-raised">
        <BottleGlyph brand={p.brand.name} size={32} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 truncate text-sm font-medium">
            <span className="truncate">{p.brand.name} {p.name}</span>
            {row.isAllTimeLow ? <Badge tone="gold">Record low</Badge> : row.isLow30d ? <Badge tone="fall">30d low</Badge> : null}
          </span>
          <span className="block text-xs text-muted">{CONCENTRATION_LABEL[p.concentration]} · {p.volumeMl} ml{row.cheapestRetailer ? ` · ${row.cheapestRetailer.name} ${row.cheapestRetailer.country}` : ""}</span>
        </span>
        <span className="text-right">
          <span className="num block text-sm">{formatMoney(row.lowestMinor == null ? null : convertMinor(row.lowestMinor, "PLN", currency, rate), currency)}</span>
          <Change value={value} className="text-xs" />
        </span>
      </Link>
    </li>
  );
}

function ProductList({ rows, currency, rate, pick, empty }: { rows: StatsRow[]; currency: CurrencyCode; rate: number; pick: (r: StatsRow) => number | null; empty: string }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return <ul className="divide-y divide-line/60">{rows.map((r) => <ProductRow key={r.productId} row={r} currency={currency} rate={rate} value={pick(r)} />)}</ul>;
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel px-4 py-3">
      <div className="label">{label}</div>
      <div className="num mt-1 text-2xl font-medium">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = getDictionary();
  const query = parseMarketQuery(await searchParams, { sort: "d1", dir: "asc" });
  const { mode } = await getMode();
  const [currency, { rate }, summary, fallers, risers, lows, recent, featured, brandMoves, brands, market] = await Promise.all([
    getCurrency(), getFx(prisma), getMarketSummary(mode), getMovers(mode, "fallers"), getMovers(mode, "risers"), getNewLows(mode),
    getRecentChanges(mode), getFeatured(mode), getBrandMoves(mode), listBrands(), listMarket(query, 25, mode),
  ]);
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="flex items-center gap-3 text-xl font-medium tracking-tight">{t.home.title} <Badge tone={mode === "LIVE" ? "fall" : "gold"}>{mode === "LIVE" ? t.live.tag : t.demo.tag}</Badge></h1>
        <p className="text-xs text-muted">{t.home.lastUpdate}: <span className="num text-ink">{timeAgo(summary.lastUpdate, now)}</span></p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t.home.tracked} value={String(summary.products)} />
        <Tile label={t.home.retailers} value={String(summary.retailers)} sub={mode === "DEMO" ? "Synthetic demo sources" : "Live sources"} />
        <Tile label={t.home.discounts} value={String(summary.discounts)} sub="Store-declared, unverified" />
        <Tile label={t.home.newLows} value={String(summary.newLows)} sub="Verified against stored history" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t.home.fallers}><ProductList rate={rate} rows={fallers} currency={currency} pick={(r) => r.change24hPct} empty={t.home.none} /></Panel>
        <Panel title={t.home.risers}><ProductList rate={rate} rows={risers} currency={currency} pick={(r) => r.change24hPct} empty={t.home.none} /></Panel>
        <Panel title={t.home.bestDeals} hint={t.home.bestDealsHint}><ProductList rate={rate} rows={lows} currency={currency} pick={(r) => r.change30dPct} empty={t.home.none} /></Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t.home.recent}>
          {recent.length === 0 ? <Empty>{t.home.none}</Empty> : (
            <ul className="divide-y divide-line/60">
              {recent.map((c) => (
                <li key={String(c.id)}>
                  <Link href={`/perfumes/${c.product!.slug}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-raised">
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{c.product!.brand.name} {c.product!.name} <span className="text-muted">{CONCENTRATION_LABEL[c.product!.concentration]} {c.product!.volumeMl} ml</span></span>
                      <span className="block text-xs text-muted">{c.retailerProduct.retailer.name} {c.retailerProduct.retailer.country} · {timeAgo(c.detectedAt, now)}</span>
                    </span>
                    <span className="text-right">
                      <span className="num block whitespace-nowrap text-xs text-muted">{formatMoney(c.oldPriceMinor, c.currency)} → <span className="text-ink">{formatMoney(c.newPriceMinor, c.currency)}</span></span>
                      <Change value={c.pctChange} className="text-xs" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={t.home.featured} hint={t.home.featuredHint}><ProductList rate={rate} rows={featured} currency={currency} pick={(r) => r.change7dPct} empty={t.home.none} /></Panel>
        <Panel title={t.home.brands} hint={t.home.brandsHint}>
          {brandMoves.length === 0 ? <Empty>{t.home.none}</Empty> : (
            <ul className="divide-y divide-line/60">
              {brandMoves.map((b) => (
                <li key={b.slug}>
                  <Link href={`/perfumes?brand=${b.slug}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-raised">
                    <span className="flex items-center gap-3"><BottleGlyph brand={b.name} size={28} /><span className="text-sm font-medium">{b.name}</span><span className="num text-xs text-muted">{b.products}</span></span>
                    <Change value={b.avg7d} className="text-sm" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title={t.home.marketWatch} id="market-watch" className="scroll-mt-20">
        <MarketTable basePath="/" hash="#market-watch" query={query} rows={market.rows} total={market.total} page={market.page} pages={market.pages} currency={currency} rate={rate} brands={brands} />
      </Panel>
    </div>
  );
}
