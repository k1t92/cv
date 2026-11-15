import type { CurrencyCode } from "./money";

const LOCALE = "en-GB";

export function formatMoney(minor: number | null | undefined, currency: CurrencyCode): string {
  if (minor == null) return "—";
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency, currencyDisplay: "code" })
    .format(minor / 100)
    .replace(/^([A-Z]{3})\s?(.*)$/, "$2 $1");
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value == null) return "—";
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return `0.${"0".repeat(digits)}%`;
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(digits)}%`;
}

export type Direction = "down" | "up" | "flat" | "none";

export function direction(value: number | null | undefined, digits = 1): Direction {
  if (value == null) return "none";
  const rounded = Number(value.toFixed(digits));
  return rounded < 0 ? "down" : rounded > 0 ? "up" : "flat";
}

export function timeAgo(date: Date | null | undefined, now = new Date()): string {
  if (!date) return "never";
  const s = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  }).format(date) + " UTC";
}

export const CONCENTRATION_LABEL: Record<string, string> = {
  EDC: "EDC", EDT: "EDT", EDP: "EDP", PARFUM: "Parfum", EXTRAIT: "Extrait", OTHER: "Other",
};

export const CONCENTRATION_LONG: Record<string, string> = {
  EDC: "Eau de Cologne", EDT: "Eau de Toilette", EDP: "Eau de Parfum",
  PARFUM: "Parfum", EXTRAIT: "Extrait de Parfum", OTHER: "",
};
