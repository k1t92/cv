import Link from "next/link";
import { getDictionary } from "@/i18n";
import type { CurrencyCode } from "@/lib/money";
import type { DataMode } from "@prisma/client";
import { CURRENCY_COOKIE, MODE_COOKIE } from "@/lib/prefs";
import { CookieToggle } from "./CurrencyToggle";

export function Header({ currency, mode }: { currency: CurrencyCode; mode: DataMode }) {
  const t = getDictionary();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-[0.18em]">
          <span aria-hidden className="h-2 w-2 rounded-full bg-gold" />
          SCENTEX
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/" className="hover:text-ink">{t.nav.market}</Link>
          <Link href="/perfumes" className="hover:text-ink">{t.nav.perfumes}</Link>
          <Link href="/sources" className="hover:text-ink">Sources</Link>
        </nav>
        <form action="/perfumes" role="search" className="order-last w-full sm:order-none sm:ml-auto sm:w-72">
          <input
            type="search" name="q" aria-label={t.nav.search} placeholder={t.nav.search}
            className="w-full rounded-md border border-line bg-panel px-3 py-1.5 text-sm text-ink placeholder:text-faint hover:border-faint"
          />
        </form>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <CookieToggle
            label="Data set" current={mode} cookieName={MODE_COOKIE}
            options={[
              { value: "LIVE", label: "LIVE", activeClass: "bg-fall/15 text-fall" },
              { value: "DEMO", label: "DEMO", activeClass: "bg-gold/15 text-gold" },
            ]}
          />
          <CookieToggle label="Display currency" current={currency} cookieName={CURRENCY_COOKIE} options={[{ value: "PLN", label: "PLN" }, { value: "EUR", label: "EUR" }]} />
        </div>
      </div>
    </header>
  );
}
