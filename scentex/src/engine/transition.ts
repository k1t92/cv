import type { RawOffer } from "./types";

export interface OfferState {
  priceMinor: number;
  originalPriceMinor: number | null;
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
  lastCheckedAt: Date;
}

export interface Transition {
  /** Persist a PriceSnapshot row for this check. */
  writeSnapshot: boolean;
  /** Present when the price itself moved. */
  priceChange: { oldPriceMinor: number; newPriceMinor: number; deltaMinor: number; pctChange: number } | null;
  stateChanged: boolean;
}

/** A single-check move this large is treated as a data error and quarantined, not stored. */
export const MAX_PLAUSIBLE_MOVE = 0.7;

export function isPlausibleMove(prev: number, next: number): boolean {
  return Math.abs(next - prev) / prev <= MAX_PLAUSIBLE_MOVE;
}

function utcDay(d: Date): number {
  return Math.floor(d.getTime() / 86_400_000);
}

/**
 * Decide what a new observation means relative to the stored state.
 * Snapshots are written on change, or as a once-per-UTC-day heartbeat proving the
 * price was re-observed; identical intraday checks only bump lastCheckedAt.
 */
export function computeTransition(prev: OfferState | null, next: Pick<RawOffer, "priceMinor" | "originalPriceMinor" | "availability">, checkedAt: Date): Transition {
  if (!prev) return { writeSnapshot: true, priceChange: null, stateChanged: true };
  const priceMoved = prev.priceMinor !== next.priceMinor;
  const stateChanged =
    priceMoved ||
    prev.availability !== next.availability ||
    (prev.originalPriceMinor ?? null) !== (next.originalPriceMinor ?? null);
  const newDay = utcDay(checkedAt) > utcDay(prev.lastCheckedAt);
  return {
    writeSnapshot: stateChanged || newDay,
    stateChanged,
    priceChange: priceMoved
      ? {
          oldPriceMinor: prev.priceMinor,
          newPriceMinor: next.priceMinor,
          deltaMinor: next.priceMinor - prev.priceMinor,
          pctChange: ((next.priceMinor - prev.priceMinor) / prev.priceMinor) * 100,
        }
      : null,
  };
}
