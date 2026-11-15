export const RANGES = ["24H", "7D", "1M", "3M", "6M", "1Y", "ALL"] as const;
export type RangeKey = (typeof RANGES)[number];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const RANGE_MS: Record<Exclude<RangeKey, "ALL">, number> = {
  "24H": DAY, "7D": 7 * DAY, "1M": 30 * DAY, "3M": 91 * DAY, "6M": 182 * DAY, "1Y": 365 * DAY,
};

export function isRange(value: unknown): value is RangeKey {
  return typeof value === "string" && (RANGES as readonly string[]).includes(value);
}

/** Start of the window, or null for ALL. */
export function rangeStart(range: RangeKey, now: Date): Date | null {
  return range === "ALL" ? null : new Date(now.getTime() - RANGE_MS[range]);
}
