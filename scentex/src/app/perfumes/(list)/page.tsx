import type { Metadata } from "next";
import Link from "next/link";
import { MarketFilters } from "@/components/MarketTable";
import { Badge, BottleGlyph, Change, Empty, Pagination, Panel } from "@/components/ui";
import { getDictionary } from "@/i18n";
import { CONCENTRATION_LONG, formatMoney } from "@/lib/format";
import { convertMinor } from "@/lib/money";
import { getCurrency } from "@/lib/prefs";
import { listBrands, listMarket, marketHref, parseMarketQuery, type SortKey } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Perfume catalogue",
  description: "Browse tracked fragrances with their lowest current price and recent price movement.",
};

const SORTS: { label: string; sort: SortKey; dir: "asc" | "desc" }[] = [
  { label: "Name A–Z", sort: "name", dir: "asc" },
  { label: "Price: low to high", sort: "low", dir: "asc" },
  { label: "Price: high to low", sort: "low", dir: "desc" },
  { label: "Biggest 7d drop", sort: "d7", dir: "asc" },
  { label: "Biggest 30d drop", sort: "d30", dir: "asc" },
];

export default async function PerfumesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = getDictionary();
  const query = parseMarketQuery(await searchParams, { sort: "name", dir: "asc" });
  const [currency, brands, market] = await Promise.all([getCurrency(), listBrands(), listMarket(query, 24)]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-medium tracking-tight">{t.nav.perfumes}</h1>
      <Panel>
        <MarketFilters basePath="/perfumes" query={query} brands={brands} />
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <span className="label mr-1">Sort</span>
          {SORTS.map((s) => {
            const active = query.sort === s.sort && query.dir === s.dir;
            return (
              <Link key={s.label} href={marketHref("/perfumes", query, { sort: s.sort, dir: s.dir, page: 1 })} aria-current={active ? "true" : undefined}
                className={`rounded-full border px-2.5 py-1 text-xs ${active ? "border-faint bg-raised text-ink" : "border-line text-muted hover:text-ink"}`}>
                {s.label}
              </Link>
            );
          })}
          <span className="num ml-auto text-xs text-muted">{market.total} {t.table.results}</span>
        </div>
        {market.rows.length === 0 ? <Empty>{t.table.empty}</Empty> : (
          <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {market.rows.map((row) => {
              const p = row.product;
              return (
                <li key={row.productId} className="bg-panel">
                  <Link href={`/perfumes/${p.slug}`} className="flex h-full flex-col gap-3 p-4 hover:bg-raised">
                    <div className="flex items-start gap-3">
                      <BottleGlyph brand={p.brand.name} size={44} />
                      <div className="min-w-0">
                        <div className="label">{p.brand.name}</div>
                        <div className="truncate font-medium">{p.name}</div>
                        <div className="text-xs text-muted">{CONCENTRATION_LONG[p.concentration]} · {p.volumeMl} ml</div>
                      </div>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-2">
                      <div>
                        <div className="label">{t.table.lowest}</div>
                        <div className="num text-lg font-medium">{formatMoney(row.lowestMinor == null ? null : convertMinor(row.lowestMinor, "PLN", currency), currency)}</div>
                        <div className="text-xs text-muted">{row.inStockCount} of {row.offersCount} offers in stock</div>
                      </div>
                      <div className="text-right">
                        {row.isAllTimeLow ? <Badge tone="gold">Record low</Badge> : row.isLow30d ? <Badge tone="fall">30d low</Badge> : null}
                        <div className="mt-1 text-xs"><span className="text-faint">7d </span><Change value={row.change7dPct} /></div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination page={market.page} pages={market.pages} href={(page) => marketHref("/perfumes", query, { page })} />
      </Panel>
    </div>
  );
}
