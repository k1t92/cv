import { describe, expect, it } from "vitest";
import { computeTransition, isPlausibleMove, type OfferState } from "@/engine/transition";

const at = (iso: string) => new Date(iso);
const prev: OfferState = { priceMinor: 40000, originalPriceMinor: null, availability: "IN_STOCK", lastCheckedAt: at("2026-11-10T08:00:00Z") };

describe("change detection", () => {
  it("always stores the first observation, without a price change", () => {
    const t = computeTransition(null, { priceMinor: 40000, availability: "IN_STOCK" }, at("2026-11-10T08:00:00Z"));
    expect(t).toEqual({ writeSnapshot: true, priceChange: null, stateChanged: true });
  });

  it("does not store an identical re-check on the same day", () => {
    const t = computeTransition(prev, { priceMinor: 40000, availability: "IN_STOCK" }, at("2026-11-10T14:00:00Z"));
    expect(t.writeSnapshot).toBe(false);
    expect(t.priceChange).toBeNull();
  });

  it("stores a daily heartbeat when nothing changed", () => {
    const t = computeTransition(prev, { priceMinor: 40000, availability: "IN_STOCK" }, at("2026-11-11T00:05:00Z"));
    expect(t.writeSnapshot).toBe(true);
    expect(t.stateChanged).toBe(false);
  });

  it("records a price drop with delta and percentage", () => {
    const t = computeTransition(prev, { priceMinor: 36000, availability: "IN_STOCK" }, at("2026-11-10T14:00:00Z"));
    expect(t.priceChange).toEqual({ oldPriceMinor: 40000, newPriceMinor: 36000, deltaMinor: -4000, pctChange: -10 });
    expect(t.writeSnapshot).toBe(true);
  });

  it("treats an availability or 'was' price change as a state change but not a price change", () => {
    const stock = computeTransition(prev, { priceMinor: 40000, availability: "OUT_OF_STOCK" }, at("2026-11-10T14:00:00Z"));
    expect(stock).toMatchObject({ writeSnapshot: true, stateChanged: true, priceChange: null });
    const was = computeTransition(prev, { priceMinor: 40000, originalPriceMinor: 50000, availability: "IN_STOCK" }, at("2026-11-10T14:00:00Z"));
    expect(was).toMatchObject({ writeSnapshot: true, stateChanged: true, priceChange: null });
  });

  it("flags implausible single-check moves", () => {
    expect(isPlausibleMove(40000, 30000)).toBe(true);
    expect(isPlausibleMove(40000, 400)).toBe(false);
    expect(isPlausibleMove(40000, 4000000)).toBe(false);
  });
});
