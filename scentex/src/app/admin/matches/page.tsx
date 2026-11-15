import type { Metadata } from "next";
import { Badge, Empty, Panel } from "@/components/ui";
import { matchProduct, parseTitle, type MatchCandidate } from "@/engine/matching";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { CONCENTRATION_LABEL, formatMoney } from "@/lib/format";
import { modeOf } from "@/lib/mode";
import { createProductFromListing, linkListing, rejectListing } from "../actions";
import { AdminNav, Flash, btn, input } from "../ui";

export const metadata: Metadata = { title: "Admin · match review", robots: { index: false } };
const PAGE = 40;

export default async function MatchesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const [total, listings, products] = await Promise.all([
    prisma.retailerProduct.count({ where: { matchStatus: "PENDING_REVIEW" } }),
    prisma.retailerProduct.findMany({ where: { matchStatus: "PENDING_REVIEW" }, orderBy: { createdAt: "asc" }, take: PAGE, include: { retailer: true } }),
    prisma.product.findMany({ include: { brand: true } }),
  ]);
  const candidates: MatchCandidate[] = products.map((p) => ({ id: p.id, ean: p.ean, brandName: p.brand.name, name: p.name, concentration: p.concentration, volumeMl: p.volumeMl }));
  const slugById = new Map(products.map((p) => [p.id, p.slug]));

  return (
    <div className="space-y-4">
      <AdminNav pending={total} />
      <Flash search={await searchParams} />
      <Panel title={`Match review · ${total} pending`} hint="Listings the matcher would not link on its own. They are excluded from every price until linked. Showing the oldest first.">
        {listings.length === 0 ? <Empty>Nothing to review.</Empty> : (
          <ul className="divide-y divide-line/60">
            {listings.map((l) => {
              const parsed = parseTitle(l.rawTitle, l.rawBrand ?? undefined);
              const guess = matchProduct({ title: l.rawTitle, brand: l.rawBrand ?? undefined, ean: l.ean ?? undefined }, candidates);
              const suggestion = guess.productId ?? ("suggestionId" in guess ? guess.suggestionId : null);
              const canCreate = Boolean(parsed.concentration && parsed.volumeMl);
              return (
                <li key={l.id} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge tone={modeOf(l.retailer.sourceKind) === "LIVE" ? "fall" : "gold"}>{modeOf(l.retailer.sourceKind)}</Badge>
                    <span className="font-medium">{l.rawTitle}</span>
                    <span className="num text-muted">{formatMoney(l.priceMinor, l.currency)}</span>
                  </div>
                  <p className="text-xs text-muted">
                    {l.retailer.name} {l.retailer.country} · brand: {l.rawBrand ?? "—"} · EAN: {l.ean ?? "—"} · parsed: {parsed.concentration ? CONCENTRATION_LABEL[parsed.concentration] : "no concentration"}, {parsed.volumeMl ? `${parsed.volumeMl} ml` : "no volume"}, “{parsed.nameKey}”
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <form action={linkListing} className="flex items-end gap-2">
                      <input type="hidden" name="listingId" value={l.id} />
                      <input name="productSlug" required list="product-slugs" placeholder="product-slug" defaultValue={suggestion ? slugById.get(suggestion) : ""} className={`${input} w-72`} aria-label="Product slug" />
                      <button className={btn}>Link</button>
                    </form>
                    {canCreate && (
                      <form action={createProductFromListing} className="flex items-end gap-2">
                        <input type="hidden" name="listingId" value={l.id} />
                        <input name="brand" required placeholder="Brand" defaultValue={l.rawBrand ?? ""} className={`${input} w-40`} aria-label="Brand" />
                        <input name="name" required placeholder="Line name" className={`${input} w-48`} aria-label="Line name" />
                        <button className={btn}>Create product</button>
                      </form>
                    )}
                    <form action={rejectListing}><input type="hidden" name="listingId" value={l.id} /><button className={`${btn} text-muted`}>Reject</button></form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <datalist id="product-slugs">{products.map((p) => <option key={p.id} value={p.slug} />)}</datalist>
      </Panel>
    </div>
  );
}
