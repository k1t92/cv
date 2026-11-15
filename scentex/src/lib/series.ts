/**
 * Pure time-series helpers for price history.
 * An offer's history is a step function: a price holds until the next observation.
 */
export interface Observation {
  /** epoch ms */
  t: number;
  /** price in display-currency minor units; null = not purchasable (out of stock) */
  v: number | null;
}

export interface SeriesStats {
  min: number | null;
  max: number | null;
  avg: number | null;
  first: number | null;
  last: number | null;
  changePct: number | null;
}

/** Drop consecutive duplicates, keeping the first observation of each run. */
export function compress(points: Observation[]): Observation[] {
  const out: Observation[] = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (!prev || prev.v !== p.v) out.push(p);
  }
  return out;
}

/**
 * Clip a step series to [from, to]. The last observation before `from` is carried
 * in as a point at `from`, so the window starts with the price that was in force.
 */
export function clip(points: Observation[], from: number, to: number): Observation[] {
  const out: Observation[] = [];
  let carry: Observation | undefined;
  for (const p of points) {
    if (p.t < from) carry = p;
    else if (p.t <= to) out.push(p);
  }
  if (carry && (out.length === 0 || out[0]!.t > from)) out.unshift({ t: from, v: carry.v });
  return out;
}

/** Lowest purchasable price across several step series, evaluated at every observation time. */
export function lowestAcross(series: Observation[][]): Observation[] {
  const times = [...new Set(series.flatMap((s) => s.map((p) => p.t)))].sort((a, b) => a - b);
  const cursor = series.map(() => -1);
  const out: Observation[] = [];
  for (const t of times) {
    let low: number | null = null;
    series.forEach((s, i) => {
      while (cursor[i]! + 1 < s.length && s[cursor[i]! + 1]!.t <= t) cursor[i] = cursor[i]! + 1;
      const v = cursor[i]! >= 0 ? s[cursor[i]!]!.v : null;
      if (v != null && (low == null || v < low)) low = v;
    });
    out.push({ t, v: low });
  }
  return compress(out);
}

/** Min / max / time-weighted average / change over a step series that runs until `end`. */
export function seriesStats(points: Observation[], end: number): SeriesStats {
  let min: number | null = null;
  let max: number | null = null;
  let weighted = 0;
  let duration = 0;
  let first: number | null = null;
  let last: number | null = null;
  points.forEach((p, i) => {
    if (p.v == null) return;
    if (first == null) first = p.v;
    last = p.v;
    min = min == null ? p.v : Math.min(min, p.v);
    max = max == null ? p.v : Math.max(max, p.v);
    const until = points[i + 1]?.t ?? end;
    const span = Math.max(0, until - p.t);
    weighted += p.v * span;
    duration += span;
  });
  const avg = duration > 0 ? Math.round(weighted / duration) : last;
  const changePct = first != null && last != null && first > 0 ? ((last - first) / first) * 100 : null;
  return { min, max, avg, first, last, changePct };
}
