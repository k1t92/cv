"use client";

import { ColorType, CrosshairMode, LineSeries, LineType, createChart, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { direction, formatMoney, formatPct } from "@/lib/format";
import type { CurrencyCode } from "@/lib/money";
import { seriesColor } from "@/lib/palette";
import type { HistoryPayload } from "@/lib/queries";
import { RANGES, type RangeKey } from "@/lib/ranges";
import type { Observation } from "@/lib/series";

type Status = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; data: HistoryPayload };

const LOWEST_COLOR = "#eceef1";
const TONE = { down: "text-fall", up: "text-rise", flat: "text-muted", none: "text-faint" } as const;

/** Forward-fill a step series onto a shared time grid so every series has a value at every crosshair position. */
function onGrid(points: Observation[], grid: number[]) {
  let i = -1;
  return grid.map((t) => {
    while (i + 1 < points.length && points[i + 1]!.t <= t) i++;
    const v = i >= 0 ? points[i]!.v : null;
    const time = Math.floor(t / 1000) as UTCTimestamp;
    return v == null ? { time } : { time, value: v / 100 };
  });
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-[110px] flex-1 px-4 py-3">
      <div className="label">{label}</div>
      <div className={`num mt-1 text-base font-medium ${tone}`}>{value}</div>
    </div>
  );
}

export function PriceChart({ slug, currency, mode }: { slug: string; currency: CurrencyCode; mode: "LIVE" | "DEMO" }) {
  const [range, setRange] = useState<RangeKey>("1M");
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [compare, setCompare] = useState<Set<string>>(new Set());
  const [attempt, setAttempt] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setStatus({ kind: "loading" });
    fetch(`/api/products/${slug}/history?range=${range}&currency=${currency}&mode=${mode.toLowerCase()}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Request failed");
        setStatus({ kind: "ready", data: body as HistoryPayload });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatus({ kind: "error", message: error instanceof Error ? error.message : "Request failed" });
      });
    return () => controller.abort();
  }, [slug, range, currency, mode, attempt]);

  const data = status.kind === "ready" ? status.data : null;
  const hasPoints = Boolean(data?.lowest.some((p) => p.v != null));

  const toggle = useCallback((id: string) => {
    setCompare((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const shown = useMemo(() => data?.retailers.filter((r) => compare.has(r.id)) ?? [], [data, compare]);

  useEffect(() => {
    if (!data || !hasPoints || !container.current) return;
    const el = container.current;
    const tip = tooltip.current;
    const intraday = data.range === "24H" || data.range === "7D";
    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#969da8", fontSize: 11 },
      grid: { vertLines: { color: "#171a1f" }, horzLines: { color: "#1c1f25" } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: intraday, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Magnet, vertLine: { color: "#636a75", labelBackgroundColor: "#22262d" }, horzLine: { color: "#636a75", labelBackgroundColor: "#22262d" } },
      localization: { priceFormatter: (v: number) => v.toFixed(2) },
    });

    const all = [{ id: "lowest", name: "Lowest price", color: LOWEST_COLOR, points: data.lowest, width: 2 as const }, ...shown.map((r) => ({
      id: r.id, name: `${r.name} ${r.country}`, color: seriesColor(r.colorIndex), points: r.points, width: 1 as const,
    }))];
    const grid = [...new Set([...all.flatMap((s) => s.points.map((p) => Math.floor(p.t / 1000) * 1000)), Math.floor(data.to / 1000) * 1000])].sort((a, b) => a - b);

    const drawn: { name: string; color: string; api: ISeriesApi<"Line"> }[] = [];
    // Retailers first so the lowest-price line is painted on top.
    for (const s of [...all.slice(1), all[0]!]) {
      const api = chart.addSeries(LineSeries, {
        color: s.color, lineWidth: s.width, lineType: LineType.WithSteps,
        priceLineVisible: false, lastValueVisible: s.id === "lowest", crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: "#0a0b0d", crosshairMarkerBorderWidth: 2,
      });
      api.setData(onGrid(s.points, grid));
      drawn.push({ name: s.name, color: s.color, api });
    }
    drawn.reverse();
    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (!tip) return;
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        tip.style.opacity = "0";
        return;
      }
      const when = new Date((param.time as number) * 1000);
      const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", ...(intraday ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: "UTC" }).format(when);
      const rows = drawn.map((s) => {
        const point = param.seriesData.get(s.api) as { value?: number } | undefined;
        const value = point?.value == null ? "out of stock" : formatMoney(Math.round(point.value * 100), data.currency);
        return `<div class="flex items-center justify-between gap-4"><span class="flex items-center gap-1.5 text-muted"><span style="background:${s.color}" class="inline-block h-0.5 w-3 rounded"></span>${escapeHtml(s.name)}</span><span class="num text-ink">${value}</span></div>`;
      });
      tip.innerHTML = `<div class="mb-1 text-[11px] text-muted">${date}${intraday ? " UTC" : ""}</div>${rows.join("")}`;
      const left = Math.min(Math.max(8, param.point.x + 14), el.clientWidth - tip.offsetWidth - 8);
      tip.style.left = `${left}px`;
      tip.style.top = "8px";
      tip.style.opacity = "1";
    });

    return () => chart.remove();
  }, [data, hasPoints, shown]);

  const s = data?.stats;
  const money = (v: number | null | undefined) => formatMoney(v, currency);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div role="group" aria-label="Period" className="flex rounded-md border border-line p-0.5">
          {RANGES.map((key) => (
            <button key={key} type="button" aria-pressed={range === key} onClick={() => setRange(key)}
              className={`num rounded px-2.5 py-1 text-xs ${range === key ? "bg-raised text-ink" : "text-muted hover:text-ink"}`}>
              {key}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted"><span className={mode === "LIVE" ? "text-fall" : "text-gold"}>{mode === "LIVE" ? "LIVE DATA" : "DEMO DATA"}</span> · drag to pan · scroll to zoom</span>
      </div>

      <div className="flex flex-wrap divide-x divide-line border-b border-line">
        <Stat label="Lowest now" value={money(s?.last)} />
        <Stat label="Period low" value={money(s?.min)} />
        <Stat label="Period high" value={money(s?.max)} />
        <Stat label="Period average" value={money(s?.avg)} />
        <Stat label="Period change" value={`${direction(s?.changePct) === "down" ? "▼ " : direction(s?.changePct) === "up" ? "▲ " : ""}${formatPct(s?.changePct)}`} tone={TONE[direction(s?.changePct)]} />
      </div>

      <div className="relative h-[360px] px-2 py-3">
        {status.kind === "loading" && <div className="skeleton absolute inset-3" aria-label="Loading price history" />}
        {status.kind === "error" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted" role="alert">
            <p>{status.message}</p>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="rounded border border-line px-3 py-1.5 text-xs text-ink hover:border-faint">Try again</button>
          </div>
        )}
        {status.kind === "ready" && !hasPoints && (
          <div className="flex h-full items-center justify-center text-sm text-muted">No price observations in this period.</div>
        )}
        {status.kind === "ready" && hasPoints && <div ref={container} className="fade-in h-full w-full" />}
        <div ref={tooltip} className="pointer-events-none absolute z-10 min-w-[190px] rounded-md border border-line bg-raised/95 px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity" />
      </div>

      {data && data.retailers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          <span className="flex items-center gap-1.5 text-xs text-ink"><span className="inline-block h-0.5 w-4 rounded" style={{ background: LOWEST_COLOR }} />Lowest price</span>
          <span className="label ml-2">Compare</span>
          {data.retailers.map((r) => {
            const on = compare.has(r.id);
            return (
              <button key={r.id} type="button" aria-pressed={on} onClick={() => toggle(r.id)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${on ? "border-faint bg-raised text-ink" : "border-line text-muted hover:text-ink"}`}>
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: seriesColor(r.colorIndex), opacity: on ? 1 : 0.45 }} />
                {r.name} <span className="text-faint">{r.country}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
