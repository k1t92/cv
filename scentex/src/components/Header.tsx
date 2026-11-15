import Link from "next/link";
import { getDictionary } from "@/i18n";
import type { CurrencyCode } from "@/lib/money";
import { CURRENCY_COOKIE } from "@/lib/prefs";
import { CurrencyToggle } from "./CurrencyToggle";

export function Header({ currency }: { currency: CurrencyCode }) {
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
        </nav>
        <form action="/perfumes" role="search" className="order-last w-full sm:order-none sm:ml-auto sm:w-72">
          <input
            type="search" name="q" aria-label={t.nav.search} placeholder={t.nav.search}
            className="w-full rounded-md border border-line bg-panel px-3 py-1.5 text-sm text-ink placeholder:text-faint hover:border-faint"
          />
        </form>
        <div className="ml-auto sm:ml-0">
          <CurrencyToggle current={currency} cookieName={CURRENCY_COOKIE} />
        </div>
      </div>
    </header>
  );
}
