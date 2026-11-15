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
