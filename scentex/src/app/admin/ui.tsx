import Link from "next/link";
import { logout } from "./actions";

export function Flash({ search }: { search: Record<string, string | string[] | undefined> }) {
  const ok = typeof search.ok === "string" ? search.ok : null;
  const error = typeof search.error === "string" ? search.error : null;
  if (!ok && !error) return null;
  return (
    <p role="status" className={`rounded-md border px-3 py-2 text-sm ${error ? "border-rise/40 bg-rise/10 text-rise" : "border-fall/40 bg-fall/10 text-fall"}`}>
      {error ?? ok}
    </p>
  );
}

export function AdminNav({ pending }: { pending?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav className="flex items-center gap-4 text-sm">
        <span className="label !text-gold">Admin</span>
        <Link href="/admin" className="text-muted hover:text-ink">Sources</Link>
        <Link href="/admin/matches" className="text-muted hover:text-ink">Match review{pending ? <span className="num ml-1 text-gold">{pending}</span> : null}</Link>
        <Link href="/admin/sources/new" className="text-muted hover:text-ink">Add source</Link>
      </nav>
      <form action={logout}><button className="text-xs text-muted hover:text-ink">Sign out</button></form>
    </div>
  );
}

export const btn = "rounded border border-line px-2.5 py-1 text-xs text-ink hover:border-faint";
export const input = "w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm text-ink hover:border-faint";
