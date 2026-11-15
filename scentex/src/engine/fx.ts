import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { invalidateFxCache } from "@/lib/fx";
import { USER_AGENT } from "./feeds/fetch";

const NBP_URL = "https://api.nbp.pl/api/exchangerates/rates/a/eur/last/10/?format=json";

const nbpSchema = z.object({
  code: z.literal("EUR"),
  rates: z.array(z.object({ effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), mid: z.number().positive() })).min(1),
});

/**
 * Pull EUR/PLN mid rates from the National Bank of Poland public API (table A) and store them.
 * Official, free, no key: https://api.nbp.pl/ — published on business days around noon CET.
 */
export async function refreshNbpRates(prisma: PrismaClient): Promise<{ stored: number; latest: { date: string; rate: number } }> {
  const response = await fetch(NBP_URL, { headers: { Accept: "application/json", "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`NBP API responded ${response.status}`);
  const data = nbpSchema.parse(await response.json());
  for (const r of data.rates) {
    // Sanity band: reject anything far outside the plausible EUR/PLN range rather than corrupt every price.
    if (r.mid < 3 || r.mid > 7) throw new Error(`NBP rate ${r.mid} outside sanity band`);
    const effectiveDate = new Date(`${r.effectiveDate}T00:00:00Z`);
    await prisma.exchangeRate.upsert({
      where: { base_quote_effectiveDate_source: { base: "EUR", quote: "PLN", effectiveDate, source: "NBP" } },
      create: { base: "EUR", quote: "PLN", effectiveDate, source: "NBP", rate: r.mid },
      update: { rate: r.mid, fetchedAt: new Date() },
    });
  }
  invalidateFxCache();
  const last = data.rates[data.rates.length - 1]!;
  return { stored: data.rates.length, latest: { date: last.effectiveDate, rate: last.mid } };
}
