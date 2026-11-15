export type CurrencyCode = "PLN" | "EUR";
export const BASE_CURRENCY: CurrencyCode = "PLN";
export const CURRENCIES: CurrencyCode[] = ["PLN", "EUR"];

/** Fallback PLN per 1 EUR from env, used only when no stored reference rate exists (see lib/fx.ts). */
export function fallbackEurPlnRate(): number {
  const parsed = Number(process.env.EUR_PLN_RATE);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4.25;
}

export function convertMinor(amount: number, from: CurrencyCode, to: CurrencyCode, rate: number): number {
  if (from === to) return amount;
  return Math.round(from === "EUR" ? amount * rate : amount / rate);
}

export function toBaseMinor(amount: number, from: CurrencyCode, rate: number): number {
  return convertMinor(amount, from, BASE_CURRENCY, rate);
}

/** Percentage change from `from` to `to`; null when undefined. */
export function pctChange(from: number | null | undefined, to: number | null | undefined): number | null {
  if (from == null || to == null || from <= 0) return null;
  return ((to - from) / from) * 100;
}

/** Discount of `price` against a claimed `original`, in percent; null if there is none. */
export function discountPct(price: number, original: number | null | undefined): number | null {
  if (original == null || original <= price) return null;
  return ((original - price) / original) * 100;
}
