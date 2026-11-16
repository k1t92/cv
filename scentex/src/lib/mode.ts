import type { DataMode, Prisma, SourceKind } from "@prisma/client";

/** A retailer's data is LIVE unless its source is the synthetic demo generator. */
export function modeOf(sourceKind: SourceKind): DataMode {
  return sourceKind === "DEMO" ? "DEMO" : "LIVE";
}

/** Retailer filter selecting only enabled sources of one mode. */
export function modeFilter(mode: DataMode): Prisma.RetailerWhereInput {
  return { enabled: true, sourceKind: mode === "DEMO" ? "DEMO" : { not: "DEMO" } };
}

export function parseMode(value: unknown): DataMode | null {
  const v = typeof value === "string" ? value.toUpperCase() : "";
  return v === "LIVE" || v === "DEMO" ? v : null;
}

/**
 * Sources whose stored offers may be *shown* in a mode. In LIVE this also includes sources the
 * engine paused after an access refusal: their last observed prices stay visible, labelled as
 * paused, instead of silently vanishing. Sources an admin disabled by hand are hidden.
 */
export function visibleFilter(mode: DataMode): Prisma.RetailerWhereInput {
  return mode === "DEMO"
    ? { enabled: true, sourceKind: "DEMO" }
    : { sourceKind: { not: "DEMO" }, OR: [{ enabled: true }, { blockedAt: { not: null } }] };
}

/** A live price older than this is shown as stale and no longer competes for "lowest price". */
export const STALE_AFTER_HOURS = 72;

export function isStale(lastCheckedAt: Date, now = new Date()): boolean {
  return now.getTime() - lastCheckedAt.getTime() > STALE_AFTER_HOURS * 3_600_000;
}
