import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Header } from "@/components/Header";
import { getDictionary } from "@/i18n";
import { eurPlnRate } from "@/lib/money";
import { getCurrency } from "@/lib/prefs";
import { hasDemoData } from "@/lib/queries";
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
  const [currency, demo] = await Promise.all([getCurrency(), hasDemoData().catch(() => false)]);
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen">
        {demo && (
          <div role="note" className="border-b border-gold/30 bg-gold/10 px-4 py-2 text-center text-xs text-gold">
            <strong className="mr-2 tracking-wider">{t.demo.tag}</strong>{t.demo.banner}
          </div>
        )}
        <Header currency={currency} />
        <main className="mx-auto max-w-[1400px] px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-[1400px] space-y-1 px-4 pb-10 pt-4 text-xs text-faint">
          <p>{t.footer.note}</p>
          <p>{t.footer.fx}: <span className="num">1 EUR = {eurPlnRate().toFixed(2)} PLN</span>.</p>
        </footer>
      </body>
    </html>
  );
}
