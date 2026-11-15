"use client";

import { useMemo, useState } from "react";

export interface Cell {
  text: string;
  /** Value used for sorting; defaults to text. */
  sort?: number | string;
  tone?: "fall" | "rise" | "muted" | "gold";
  href?: string;
  strong?: boolean;
}

export interface Column {
  id: string;
  label: string;
  align?: "left" | "right";
  numeric?: boolean;
}

interface Props {
  columns: Column[];
  rows: { key: string; cells: Record<string, Cell>; highlight?: boolean }[];
  initialSort: { id: string; dir: "asc" | "desc" };
  /** Optional dropdown filter on one column's text. */
  filter?: { columnId: string; allLabel: string };
  emptyLabel: string;
  pageSize?: number;
}

const TONE = { fall: "text-fall", rise: "text-rise", muted: "text-muted", gold: "text-gold" } as const;

/** Small client-side sortable / filterable table for per-product data sets. */
export function DataTable({ columns, rows, initialSort, filter, emptyLabel, pageSize = 15 }: Props) {
  const [sort, setSort] = useState(initialSort);
  const [selected, setSelected] = useState("");
  const [shown, setShown] = useState(pageSize);

  const options = useMemo(
    () => (filter ? [...new Set(rows.map((r) => r.cells[filter.columnId]?.text ?? ""))].sort() : []),
    [rows, filter],
  );

  const visible = useMemo(() => {
    const filtered = filter && selected ? rows.filter((r) => r.cells[filter.columnId]?.text === selected) : rows;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a.cells[sort.id]?.sort ?? a.cells[sort.id]?.text ?? "";
      const bv = b.cells[sort.id]?.sort ?? b.cells[sort.id]?.text ?? "";
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [rows, sort, selected, filter]);

  return (
    <div>
      {filter && options.length > 1 && (
        <div className="border-b border-line px-4 py-3">
          <select
            value={selected}
            onChange={(e) => { setSelected(e.target.value); setShown(pageSize); }}
            aria-label={filter.allLabel}
            className="rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm text-ink hover:border-faint"
          >
            <option value="">{filter.allLabel}</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )}
      {visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="border-b border-line">
              <tr>
                {columns.map((col) => {
                  const active = sort.id === col.id;
                  return (
                    <th key={col.id} scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                      className={`px-3 py-2 font-normal first:pl-4 last:pr-4 ${col.align === "right" ? "text-right" : "text-left"}`}>
                      <button type="button" onClick={() => setSort({ id: col.id, dir: active && sort.dir === "asc" ? "desc" : "asc" })}
                        className={`label inline-flex items-center gap-1 hover:text-ink ${active ? "!text-ink" : ""}`}>
                        {col.label}
                        <span aria-hidden className={active ? "text-gold" : "opacity-0"}>{sort.dir === "asc" ? "↑" : "↓"}</span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.slice(0, shown).map((row) => (
                <tr key={row.key} className={`border-b border-line/60 last:border-0 hover:bg-raised ${row.highlight ? "bg-gold/[0.06]" : ""}`}>
                  {columns.map((col) => {
                    const cell = row.cells[col.id] ?? { text: "—" };
                    const cls = `${col.numeric ? "num" : ""} ${cell.tone ? TONE[cell.tone] : ""} ${cell.strong ? "font-medium" : ""}`;
                    return (
                      <td key={col.id} className={`px-3 py-2.5 first:pl-4 last:pr-4 ${col.align === "right" ? "text-right" : "text-left"} ${cls}`}>
                        {cell.href
                          ? <a href={cell.href} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-line underline-offset-4 hover:text-gold hover:decoration-gold">{cell.text} ↗</a>
                          : cell.text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {visible.length > shown && (
        <div className="border-t border-line px-4 py-3 text-center">
          <button type="button" onClick={() => setShown((n) => n + pageSize)} className="rounded border border-line px-3 py-1.5 text-xs hover:border-faint">
            Show more ({visible.length - shown} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
