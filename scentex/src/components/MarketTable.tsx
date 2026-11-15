import Link from "next/link";
import { getDictionary } from "@/i18n";
import { CONCENTRATION_LABEL, formatMoney } from "@/lib/format";
import { convertMinor, type CurrencyCode } from "@/lib/money";
import { CONCENTRATIONS, marketHref, type MarketQuery, type SortKey, type StatsRow } from "@/lib/queries";
import { Badge, BottleGlyph, Change, Empty, Pagination } from "./ui";

interface Props {
  basePath: string;
  hash?: string;
  query: MarketQuery;
  rows: StatsRow[];
  total: number;
  page: number;
  pages: number;
  currency: CurrencyCode;
  brands: { slug: string; name: string }[];
}

const field = "rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm text-ink hover:border-faint";

export function MarketFilters({ basePath, query, brands, hash = "" }: Pick<Props, "basePath" | "query" | "brands" | "hash">) {
  const t = getDictionary().table;
  const active = Boolean(query.q || query.brand || query.conc);
  return (
    <form action={`${basePath}${hash}`} className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
      <input type="hidden" name="sort" value={query.sort} />
      <input type="hidden" name="dir" value={query.dir} />
      <input type="search" name="q" defaultValue={query.q} placeholder={getDictionary().nav.search} aria-label={getDictionary().nav.search} className={`${field} w-full sm:w-64`} />
      <select name="brand" defaultValue={query.brand} aria-label={t.brand} className={field}>
        <option value="">{t.allBrands}</option>
        {brands.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
      </select>
      <select name="conc" defaultValue={query.conc} aria-label={t.conc} className={field}>
        <option value="">{t.allConc}</option>
        {CONCENTRATIONS.map((c) => <option key={c} value={c}>{CONCENTRATION_LABEL[c]}</option>)}
      </select>
      <button type="submit" className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-bg hover:bg-white">{t.apply}</button>
      {active && <Link href={`${basePath}${hash}`} scroll={false} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">{t.reset}</Link>}
    </form>
  );
}

export function MarketTable({ basePath, hash = "", query, rows, total, page, pages, currency, brands }: Props) {
  const t = getDictionary().table;
  const money = (base: number | null) => formatMoney(base == null ? null : convertMinor(base, "PLN", currency), currency);

  const Th = ({ id, label, align = "right", className = "" }: { id: SortKey; label: string; align?: "left" | "right"; className?: string }) => {
    const active = query.sort === id;
    const nextDir = active && query.dir === "asc" ? "desc" : "asc";
    return (
      <th scope="col" aria-sort={active ? (query.dir === "asc" ? "ascending" : "descending") : "none"} className={`px-3 py-2 font-normal ${align === "right" ? "text-right" : "text-left"} ${className}`}>
        <Link href={marketHref(basePath, query, { sort: id, dir: nextDir, page: 1 }, hash)} scroll={false} className={`label inline-flex items-center gap-1 hover:text-ink ${active ? "!text-ink" : ""}`}>
          {label}
          <span aria-hidden className={active ? "text-gold" : "opacity-0"}>{query.dir === "asc" ? "↑" : "↓"}</span>
        </Link>
      </th>
    );
  };

  return (
    <>
      <MarketFilters basePath={basePath} query={query} brands={brands} hash={hash} />
      {rows.length === 0 ? (
        <Empty>{t.empty}</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="border-b border-line">
              <tr>
                <Th id="name" label={t.perfume} align="left" className="pl-4" />
                <Th id="brand" label={t.brand} align="left" />
                <Th id="conc" label={t.conc} align="left" />
                <Th id="volume" label={t.volume} />
                <Th id="low" label={t.lowest} />
                <Th id="avg" label={t.average} />
                <Th id="high" label={t.highest} />
                <Th id="d1" label={t.d1} />
                <Th id="d7" label={t.d7} />
                <Th id="d30" label={t.d30} />
                <Th id="retailer" label={t.cheapest} align="left" className="pr-4" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.productId} className="border-b border-line/60 last:border-0 hover:bg-raised">
                  <td className="py-2 pl-4 pr-3">
                    <Link href={`/perfumes/${row.product.slug}`} className="flex items-center gap-3 font-medium hover:text-gold">
                      <BottleGlyph brand={row.product.brand.name} size={28} />
                      <span>{row.product.name}</span>
                      {row.isAllTimeLow ? <Badge tone="gold">Record low</Badge> : row.isLow30d ? <Badge tone="fall">30d low</Badge> : null}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted">{row.product.brand.name}</td>
                  <td className="px-3 py-2 text-muted">{CONCENTRATION_LABEL[row.product.concentration]}</td>
                  <td className="num px-3 py-2 text-right text-muted">{row.product.volumeMl} ml</td>
                  <td className="num px-3 py-2 text-right font-medium">{money(row.lowestMinor)}</td>
                  <td className="num px-3 py-2 text-right text-muted">{money(row.avgMinor)}</td>
                  <td className="num px-3 py-2 text-right text-muted">{money(row.highestMinor)}</td>
                  <td className="px-3 py-2 text-right"><Change value={row.change24hPct} /></td>
                  <td className="px-3 py-2 text-right"><Change value={row.change7dPct} /></td>
                  <td className="px-3 py-2 text-right"><Change value={row.change30dPct} /></td>
                  <td className="py-2 pl-3 pr-4 text-muted">
                    {row.cheapestRetailer ? <>{row.cheapestRetailer.name} <span className="text-faint">{row.cheapestRetailer.country}</span></> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between px-4 pb-2 pt-3 text-xs text-muted">
        <span className="num">{total} {t.results}</span>
      </div>
      <Pagination page={page} pages={pages} href={(p) => marketHref(basePath, query, { page: p }, hash)} />
    </>
  );
}
