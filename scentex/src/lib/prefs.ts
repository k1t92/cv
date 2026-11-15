import { cookies } from "next/headers";
import type { CurrencyCode } from "./money";

export const CURRENCY_COOKIE = "scentex_currency";

export async function getCurrency(): Promise<CurrencyCode> {
  const value = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return value === "EUR" ? "EUR" : "PLN";
}
