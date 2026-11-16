import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Header } from "@/components/Header";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { formatDateTime, timeAgo } from "@/lib/format";
import { getFx } from "@/lib/fx";
import { modeFilter } from "@/lib/mode";
import { getCurrency, getMode } from "@/lib/prefs";
import "./globals.css";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "SCENTEX — perfume price exchange", template: "%s · SCENTEX" },
  description: "Track fragrance prices across Polish and European retailers: price history, real price drops and the cheapest current offer.",
  openGraph: { siteName: "SCENTEX", type: "website" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const t = getDictionary();
  const [currency, { mode, counts }, fx] = await Promise.all([getCurrency(), getMode(), getFx(prisma)]);
  const lastImport = mode === "LIVE" ? (await prisma.retailer.aggregate({ where: modeFilter("LIVE"), _max: { lastRunAt: true } }))._max.lastRunAt : null;
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen">
        {mode === "DEMO" ? (
          <div role="note" className="border-b border-gold/30 bg-gold/10 px-4 py-2 text-center text-xs text-gold">
            <strong className="mr-2 tracking-wider">{t.demo.tag}</strong>{t.demo.banner}
            {counts.live > 0 && " Switch to LIVE in the header for real prices."}
          </div>
        ) : (
          <div role="note" className="border-b border-fall/30 bg-fall/10 px-4 py-2 text-center text-xs text-fall">
            <strong className="mr-2 tracking-wider">{t.live.tag}</strong>
            {counts.live > 0
              ? <>{t.live.banner} {counts.live} source{counts.live === 1 ? "" : "s"} · last import {timeAgo(lastImport)}.</>
              : t.live.none}
          </div>
        )}
        <Header currency={currency} mode={mode} />
        <main className="mx-auto max-w-[1400px] px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-[1400px] space-y-1 px-4 pb-10 pt-4 text-xs text-faint">
          <p>{t.footer.note} <a href="/sources" className="underline underline-offset-4 hover:text-ink">Data sources and their status</a></p>
          <p>
            <span className="num">1 EUR = {fx.rate.toFixed(4)} PLN</span> ·{" "}
            {fx.effectiveDate
              ? <>{fx.source} reference rate of {formatDateTime(fx.effectiveDate).slice(0, 11)} (live)</>
              : <>static fallback rate — no reference rate has been fetched yet</>}
          </p>
        </footer>
      </body>
    </html>
  );
}
