/**
 * Deterministic synthetic price simulator for DEMO retailers.
 * Given the same (product, retailer) it always produces the same day-by-day series,
 * so the seed (backfill) and the demo adapter (live tick) agree with each other.
 * Nothing here is, or pretends to be, a real market quote.
 */
import type { DemoProduct, DemoRetailer } from "./catalog";
import { demoProductSlug } from "./catalog";

const DAY = 86_400_000;
/** Simulation starts here; history depth = days since the anchor. */
export const DEMO_ANCHOR_DAY = Math.floor(Date.UTC(2026, 4, 1) / DAY);
const DEMO_EUR_PLN = 4.25;

export interface DemoDayState {
  day: number;
  checkAt: Date;
  priceMinor: number;
  originalPriceMinor: number | null;
  availability: "IN_STOCK" | "OUT_OF_STOCK";
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function utcDayOf(date: Date): number {
  return Math.floor(date.getTime() / DAY);
}

export function carries(product: DemoProduct, retailer: DemoRetailer): boolean {
  return (hash(`carry:${demoProductSlug(product)}:${retailer.slug}`) % 1000) / 1000 < retailer.carryRate;
}

/** Retail-style rounding: whole units minus one minor unit (e.g. 389.99). */
function retailRound(amount: number): number {
  return Math.max(1, Math.round(amount)) * 100 - 1;
}

export function simulate(product: DemoProduct, retailer: DemoRetailer, untilDay: number): DemoDayState[] {
  const key = `${demoProductSlug(product)}:${retailer.slug}`;
  const rand = mulberry32(hash(key));
  const listPrice = product.basePln / (retailer.currency === "EUR" ? DEMO_EUR_PLN : 1);
  const jitter = 0.96 + rand() * 0.08;
  let regular = listPrice * retailer.priceFactor * jitter;
  const floor = regular * 0.75;
  const ceil = regular * 1.2;
  const checkOffsetMs = (hash(`t:${key}`) % (24 * 60)) * 60_000;

  let promoLeft = 0;
  let promoDepth = 0;
  let outLeft = 0;
  const states: DemoDayState[] = [];

  for (let day = DEMO_ANCHOR_DAY; day <= untilDay; day++) {
    if (rand() < 0.045) regular = Math.min(ceil, Math.max(floor, regular * (1 + (rand() * 0.11 - 0.06))));
    if (promoLeft > 0) promoLeft--;
    else if (rand() < 0.02) {
      promoLeft = 2 + Math.floor(rand() * 8);
      promoDepth = 0.08 + rand() * 0.17;
    }
    if (outLeft > 0) outLeft--;
    else if (rand() < 0.012) outLeft = 1 + Math.floor(rand() * 5);

    const onPromo = promoLeft > 0;
    const price = retailRound(onPromo ? regular * (1 - promoDepth) : regular);
    const regularMinor = retailRound(regular);
    const rrp = retailRound(listPrice * 1.1);
    let original: number | null = null;
    if (onPromo && regularMinor > price) original = regularMinor;
    // Some stores permanently show a struck-through list price: a claimed discount, not a real drop.
    if (retailer.showsRrp && rrp > price) original = Math.max(original ?? 0, rrp);

    states.push({
      day,
      checkAt: new Date(day * DAY + checkOffsetMs),
      priceMinor: price,
      originalPriceMinor: original,
      availability: outLeft > 0 ? "OUT_OF_STOCK" : "IN_STOCK",
    });
  }
  return states;
}
