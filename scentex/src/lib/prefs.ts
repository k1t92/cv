import { cookies } from "next/headers";
import type { DataMode } from "@prisma/client";
import { parseMode } from "./mode";
import type { CurrencyCode } from "./money";
import { getSourceCounts } from "./queries";

export const CURRENCY_COOKIE = "scentex_currency";

export async function getCurrency(): Promise<CurrencyCode> {
  const value = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return value === "EUR" ? "EUR" : "PLN";
}

export const MODE_COOKIE = "scentex_mode";

/**
 * Which market the visitor sees. LIVE whenever a live source exists; DEMO is only the
 * default while nothing real is connected, and is always labelled as such.
 */
export async function getMode(): Promise<{ mode: DataMode; counts: { live: number; demo: number } }> {
  const counts = await getSourceCounts();
  const requested = parseMode((await cookies()).get(MODE_COOKIE)?.value);
  const fallback: DataMode = counts.live > 0 || counts.demo === 0 ? "LIVE" : "DEMO";
  return { mode: requested ?? fallback, counts };
}
