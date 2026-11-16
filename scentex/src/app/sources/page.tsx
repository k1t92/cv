import type { Metadata } from "next";
import { Badge, Empty, Panel } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDateTime, timeAgo } from "@/lib/format";

export const metadata: Metadata = {
  title: "Data sources",
  description: "Which retailers SCENTEX collects prices from, how, and which ones it does not collect and why.",
};

const ACCESS_LABEL = {
  PUBLIC_ACCESS_SUPPORTED: "Public pages, permitted", PARTIALLY_SUPPORTED: "Partially available", REQUIRES_PARTNERSHIP: "Needs an agreement",
  RESTRICTED: "Automated access refused", NOT_VERIFIED: "Not verified",
} as const;

export default async function SourcesPage() {
  const now = new Date();
  const sources = await prisma.retailer.findMany({
    where: { sourceKind: { not: "DEMO" } },
    orderBy: [{ enabled: "desc" }, { blockedAt: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    include: { _count: { select: { offers: { where: { productId: { not: null } } } } } },
  });
  const latest = await prisma.retailerProduct.groupBy({ by: ["retailerId"], _max: { lastCheckedAt: true } });
  const lastCheck = new Map(latest.map((l) => [l.retailerId, l._max.lastCheckedAt]));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-medium tracking-tight">Data sources</h1>
      <p className="max-w-3xl text-sm text-muted">
        SCENTEX reads prices only from pages a shop publishes for everyone, within the rules of its robots.txt, at a low request rate and
        with an identifiable bot. If a shop refuses automated access, collection stops and the shop is listed here as not collected — its
        protection is never worked around.
      </p>
      <Panel title="Live sources">
        {sources.length === 0 ? <Empty>No live source has been registered yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-line text-left">
                <tr>{["Retailer", "Status", "Access", "Matched offers", "Last price check", "Note"].map((h) => <th key={h} className="label px-3 py-2 font-normal first:pl-4">{h}</th>)}</tr>
              </thead>
              <tbody>
                {sources.map((s) => {
                  const checked = lastCheck.get(s.id) ?? null;
                  return (
                    <tr key={s.id} className="border-b border-line/60 align-top last:border-0">
                      <td className="py-2.5 pl-4 pr-3 font-medium">{s.name} <span className="text-faint">{s.country}</span><div className="text-xs font-normal text-muted">{new URL(s.websiteUrl).host}</div></td>
                      <td className="px-3 py-2.5">
                        {s.enabled ? <Badge tone="fall">Collecting</Badge> : s.blockedAt ? <Badge tone="rise">Paused</Badge> : <Badge>Not collected</Badge>}
                      </td>
                      <td className="px-3 py-2.5 text-muted">{ACCESS_LABEL[s.accessStatus]}</td>
                      <td className="num px-3 py-2.5">{s._count.offers}</td>
                      <td className="px-3 py-2.5 text-xs text-muted">{checked ? <>{formatDateTime(checked)}<br />{timeAgo(checked, now)}</> : "—"}</td>
                      <td className="max-w-md px-3 py-2.5 pr-4 text-xs text-muted">
                        {s.blockedAt ? `Paused ${formatDateTime(s.blockedAt)}: the site refused an automated request. Prices shown from this source are the last ones observed and are not being refreshed.` : s.enabled ? "Read from the shop's public product pages (schema.org data)." : s.blockedReason ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
