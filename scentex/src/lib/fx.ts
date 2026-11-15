import type { PrismaClient } from "@prisma/client";
import { fallbackEurPlnRate } from "./money";

export interface FxInfo {
  /** PLN per 1 EUR */
  rate: number;
  /** "NBP" etc., or "static" when falling back to the env value */
  source: string;
  effectiveDate: Date | null;
}

let cache: { at: number; value: FxInfo } | null = null;
const TTL_MS = 5 * 60_000;

/** Latest stored EUR→PLN reference rate; falls back to EUR_PLN_RATE when none has been fetched yet. */
export async function getFx(prisma: PrismaClient): Promise<FxInfo> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const row = await prisma.exchangeRate.findFirst({ where: { base: "EUR", quote: "PLN" }, orderBy: { effectiveDate: "desc" } });
  const value: FxInfo = row
    ? { rate: row.rate, source: row.source, effectiveDate: row.effectiveDate }
    : { rate: fallbackEurPlnRate(), source: "static", effectiveDate: null };
  cache = { at: Date.now(), value };
  return value;
}

export function invalidateFxCache(): void {
  cache = null;
}
