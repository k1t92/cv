import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Empty, Panel } from "@/components/ui";
import { nextRunAt } from "@/engine/scheduler";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { formatDateTime, timeAgo } from "@/lib/format";
import { getFx } from "@/lib/fx";
import { modeOf } from "@/lib/mode";
import { refreshFx, runNow, toggleSource } from "./actions";
import { AdminNav, Flash, btn } from "./ui";

export const metadata: Metadata = { title: "Admin · sources", robots: { index: false } };

const STATUS_TONE = { SUCCEEDED: "fall", PARTIAL: "gold", FAILED: "rise", RUNNING: "neutral" } as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const [sources, jobs, pending, fx, rates] = await Promise.all([
    prisma.retailer.findMany({ orderBy: [{ sourceKind: "desc" }, { name: "asc" }], include: { _count: { select: { offers: true } } } }),
    prisma.scraperJob.findMany({ orderBy: { startedAt: "desc" }, take: 25, include: { retailer: true } }),
    prisma.retailerProduct.count({ where: { matchStatus: "PENDING_REVIEW" } }),
    getFx(prisma),
    prisma.exchangeRate.findMany({ orderBy: { effectiveDate: "desc" }, take: 5 }),
  ]);
  const matched = await prisma.retailerProduct.groupBy({ by: ["retailerId"], where: { productId: { not: null } }, _count: true });
  const matchedBy = new Map(matched.map((m) => [m.retailerId, m._count]));
  const now = new Date();
  const live = sources.filter((s) => s.sourceKind !== "DEMO");

  return (
    <div className="space-y-4">
      <AdminNav pending={pending} />
      <Flash search={await searchParams} />

      {live.length === 0 && (
        <p className="rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">
          No live source is connected. Add one with a feed URL you are entitled to use (see DATA_SOURCES.md). Until then the public site can only show DEMO data.
        </p>
      )}

      <Panel title="Sources" hint="A source is imported when its interval has elapsed (worker) or on demand. New sources start disabled.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="border-b border-line text-left">
              <tr>{["Source", "Data", "Type", "Status", "Last run", "Next run", "Offers", "Matched", ""].map((h) => <th key={h} className="label px-3 py-2 font-normal first:pl-4">{h}</th>)}</tr>
            </thead>
            <tbody>
              {sources.map((s) => {
                const mode = modeOf(s.sourceKind);
                return (
                  <tr key={s.id} className="border-b border-line/60 align-top last:border-0">
                    <td className="py-2.5 pl-4 pr-3">
                      <div className="font-medium">{s.name} <span className="text-faint">{s.country} · {s.currency}</span></div>
                      <div className="num text-xs text-muted">{s.slug}</div>
                      {s.lastError && <div className="mt-1 max-w-md text-xs text-rise">{s.lastError}</div>}
                    </td>
                    <td className="px-3 py-2.5"><Badge tone={mode === "LIVE" ? "fall" : "gold"}>{mode}</Badge></td>
                    <td className="px-3 py-2.5 text-xs text-muted">{s.sourceKind}<br />{s.feedPreset ?? s.adapterKey}</td>
                    <td className="px-3 py-2.5">
                      {!s.enabled ? <Badge>Disabled</Badge> : s.lastStatus ? <Badge tone={STATUS_TONE[s.lastStatus]}>{s.lastStatus}</Badge> : <Badge>Never run</Badge>}
                      {s.consecutiveFailures > 0 && <div className="mt-1 text-xs text-rise">{s.consecutiveFailures} failed run{s.consecutiveFailures === 1 ? "" : "s"} in a row</div>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted">{timeAgo(s.lastRunAt, now)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">{!s.enabled ? "—" : nextRunAt(s) <= now ? "due now" : formatDateTime(nextRunAt(s))}<br />every {s.intervalMinutes} min</td>
                    <td className="num px-3 py-2.5">{s._count.offers}</td>
                    <td className="num px-3 py-2.5">{matchedBy.get(s.id) ?? 0}</td>
                    <td className="px-3 py-2.5 pr-4">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <form action={runNow}><input type="hidden" name="id" value={s.id} /><button className={btn}>Run now</button></form>
                        <form action={toggleSource}><input type="hidden" name="id" value={s.id} /><button className={btn}>{s.enabled ? "Disable" : "Enable"}</button></form>
                        {mode === "LIVE" && <Link href={`/admin/sources/${s.id}`} className={btn}>Edit</Link>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Exchange rate" className="lg:col-span-1" action={<form action={refreshFx}><button className={btn}>Refresh from NBP</button></form>}>
          <div className="px-4 py-3">
            <p className="num text-2xl font-medium">1 EUR = {fx.rate.toFixed(4)} PLN</p>
            <p className="mt-1 text-xs text-muted">{fx.effectiveDate ? `${fx.source} table A · ${formatDateTime(fx.effectiveDate).slice(0, 11)}` : "Static fallback (EUR_PLN_RATE). Nothing fetched yet."}</p>
          </div>
          {rates.length > 0 && (
            <ul className="border-t border-line text-xs">
              {rates.map((r) => <li key={r.id} className="num flex justify-between px-4 py-1.5 text-muted"><span>{formatDateTime(r.effectiveDate).slice(0, 11)}</span><span className="text-ink">{r.rate.toFixed(4)}</span></li>)}
            </ul>
          )}
        </Panel>

        <Panel title="Import log" hint="Most recent 25 runs." className="lg:col-span-2">
          {jobs.length === 0 ? <Empty>No imports have run yet.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-line text-left">
                  <tr>{["Started", "Source", "Status", "Seen", "Changed", "Rejected", "Unmatched", "Missing"].map((h) => <th key={h} className="label px-3 py-2 font-normal first:pl-4">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2 pl-4 pr-3 text-xs text-muted">{formatDateTime(j.startedAt)}</td>
                      <td className="px-3 py-2">{j.retailer.name} <span className="text-faint">{j.retailer.country}</span>{j.errorMessage && <div className="max-w-sm text-xs text-rise">{j.errorMessage}</div>}</td>
                      <td className="px-3 py-2"><Badge tone={STATUS_TONE[j.status]}>{j.status}</Badge></td>
                      <td className="num px-3 py-2">{j.offersSeen}</td>
                      <td className="num px-3 py-2">{j.offersChanged}</td>
                      <td className="num px-3 py-2">{j.offersRejected}</td>
                      <td className="num px-3 py-2">{j.unmatched}</td>
                      <td className="num px-3 py-2">{j.offersMissing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
