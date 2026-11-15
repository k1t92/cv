import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui";
import { FEED_PRESETS } from "@/engine/feeds/presets";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { deleteSource, saveSource } from "../../actions";
import { AdminNav, Flash, btn, input } from "../../ui";

export const metadata: Metadata = { title: "Admin · source", robots: { index: false } };

const KINDS = [
  ["AFFILIATE_FEED", "Affiliate network feed"], ["XML_CSV_FEED", "Retailer-provided feed"],
  ["API", "API export"], ["STRUCTURED_DATA", "Structured data export"],
] as const;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="label">{label}</span>{children}{hint && <span className="block text-xs text-muted">{hint}</span>}</label>;
}

export default async function SourcePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const { id } = await params;
  const source = id === "new" ? null : await prisma.retailer.findUnique({ where: { id } });
  if (id !== "new" && (!source || source.sourceKind === "DEMO")) notFound();
  const options = (source?.feedOptions ?? {}) as { includePattern?: string; excludePattern?: string };

  return (
    <div className="space-y-4">
      <AdminNav />
      <Flash search={await searchParams} />
      <Panel title={source ? `Edit ${source.name}` : "Add a live source"} hint="Only connect feeds you are entitled to use: an affiliate-network feed for a programme you joined, or an export the retailer gave you.">
        <form action={saveSource} className="grid gap-4 p-4 sm:grid-cols-2">
          {source && <input type="hidden" name="id" value={source.id} />}
          <Field label="Retailer name"><input name="name" required defaultValue={source?.name} className={input} /></Field>
          <Field label="Storefront URL"><input name="websiteUrl" type="url" required placeholder="https://www.example.pl" defaultValue={source?.websiteUrl} className={input} /></Field>
          <Field label="Country (ISO 2)"><input name="country" required maxLength={2} placeholder="PL" defaultValue={source?.country} className={input} /></Field>
          <Field label="Currency" hint="Offers quoted in any other currency are rejected.">
            <select name="currency" defaultValue={source?.currency ?? "PLN"} className={input}><option>PLN</option><option>EUR</option></select>
          </Field>
          <Field label="Source type">
            <select name="sourceKind" defaultValue={source?.sourceKind ?? "AFFILIATE_FEED"} className={input}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
          <Field label="Feed layout">
            <select name="feedPreset" defaultValue={source?.feedPreset ?? "awin-csv"} className={input}>{FEED_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Feed URL" hint="Stored in the database. If the URL itself contains a secret key, anyone with database access can read it."><input name="feedUrl" type="url" required defaultValue={source?.feedUrl ?? ""} className={input} /></Field>
          </div>
          <Field label="Refresh interval (minutes)" hint="Minimum 60. Most affiliate feeds regenerate once a day (1440).">
            <input name="intervalMinutes" type="number" min={60} max={10080} required defaultValue={source?.intervalMinutes ?? 1440} className={input} />
          </Field>
          <Field label="Auth header env var (optional)" hint='Name of an environment variable containing "Header-Name: value".'>
            <input name="authHeaderEnv" placeholder="FEED_AUTH_EXAMPLE" defaultValue={source?.authHeaderEnv ?? ""} className={input} />
          </Field>
          <Field label="Include pattern (optional)" hint="Regex on title + category. Use it to keep only fragrance rows of a general beauty feed.">
            <input name="includePattern" placeholder="perfum|parfum|toilette|cologne" defaultValue={options.includePattern ?? ""} className={input} />
          </Field>
          <Field label="Exclude pattern (optional)" hint="Regex on title + category.">
            <input name="excludePattern" placeholder="tester|zestaw|set|sample|próbka" defaultValue={options.excludePattern ?? ""} className={input} />
          </Field>
          <div className="sm:col-span-2"><button className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-bg hover:bg-white">{source ? "Save changes" : "Create source (disabled)"}</button></div>
        </form>
        <div className="border-t border-line px-4 py-3 text-xs text-muted">
          <p className="label mb-1">Layout notes</p>
          <ul className="space-y-1">{FEED_PRESETS.map((p) => <li key={p.key}><span className="text-ink">{p.label}:</span> {p.notes}</li>)}</ul>
        </div>
      </Panel>

      {source && (
        <Panel title="Delete source" hint="Removes the source, all its offers and their entire price history. This cannot be undone.">
          <form action={deleteSource} className="flex flex-wrap items-end gap-3 p-4">
            <input type="hidden" name="id" value={source.id} />
            <Field label={`Type "${source.slug}" to confirm`}><input name="confirm" required autoComplete="off" className={input} /></Field>
            <button className={`${btn} border-rise/50 text-rise`}>Delete permanently</button>
          </form>
        </Panel>
      )}
    </div>
  );
}
