import Link from "next/link";
import type { ReactNode } from "react";
import { direction, formatPct } from "@/lib/format";

export function Panel({ title, hint, action, children, className = "", id }: {
  title?: string; hint?: string; action?: ReactNode; children: ReactNode; className?: string; id?: string;
}) {
  return (
    <section id={id} className={`min-w-0 rounded-lg border border-line bg-panel ${className}`}>
      {title && (
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="label !text-ink">{title}</h2>
            {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const TONE = { down: "text-fall", up: "text-rise", flat: "text-muted", none: "text-faint" } as const;
const ARROW = { down: "▼", up: "▲", flat: "", none: "" } as const;

/** Percentage move. Direction is carried by arrow and sign as well as colour. */
export function Change({ value, className = "" }: { value: number | null | undefined; className?: string }) {
  const dir = direction(value);
  return (
    <span className={`num whitespace-nowrap ${TONE[dir]} ${className}`}>
      {ARROW[dir] && <span aria-hidden className="mr-1 text-[0.7em]">{ARROW[dir]}</span>}
      {formatPct(value)}
    </span>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "gold" | "fall" | "rise" }) {
  const styles = {
    neutral: "border-line text-muted",
    gold: "border-gold/40 text-gold bg-gold/10",
    fall: "border-fall/40 text-fall bg-fall/10",
    rise: "border-rise/40 text-rise bg-rise/10",
  }[tone];
  return <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-sm text-muted">{children}</p>;
}

function hue(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

/** Placeholder artwork. No retailer or brand imagery is used until an image source is licensed. */
export function BottleGlyph({ brand, size = 40 }: { brand: string; size?: number }) {
  const initials = brand.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const tint = `hsl(${hue(brand)} 22% 46%)`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={`${brand} placeholder`} className="shrink-0">
      <rect width="40" height="40" rx="8" fill="#171a1f" stroke="#22262d" />
      <rect x="16" y="5" width="8" height="5" rx="1" fill={tint} opacity=".7" />
      <rect x="10" y="11" width="20" height="24" rx="4" fill={tint} opacity=".28" stroke={tint} />
      <text x="20" y="27" textAnchor="middle" fontSize="9" fontWeight="600" fill="#eceef1" fontFamily="ui-sans-serif, system-ui">{initials}</text>
    </svg>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  const link = "rounded border border-line px-3 py-1.5 text-xs text-ink hover:border-faint";
  const off = "rounded border border-line px-3 py-1.5 text-xs text-faint";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between border-t border-line px-4 py-3">
      {page > 1 ? <Link className={link} href={href(page - 1)} scroll={false}>← Previous</Link> : <span className={off}>← Previous</span>}
      <span className="num text-xs text-muted">Page {page} / {pages}</span>
      {page < pages ? <Link className={link} href={href(page + 1)} scroll={false}>Next →</Link> : <span className={off}>Next →</span>}
    </nav>
  );
}
