# SCENTEX — perfume price exchange

A price-tracking terminal for fragrances: lowest current price across retailers, stored price
history, real price drops vs. store-claimed discounts. Target markets: Poland first, then the EU.

> **Status: Phase 1 (foundation).** The application, database, ingest pipeline and charts are real
> and working. **The prices are not.** No retailer source is connected yet, so the database is
> seeded with clearly labelled synthetic *demo* data (`Retailer.sourceKind = DEMO`). The UI shows a
> demo banner on every page while any demo source is enabled.

## What works today

| Area | State |
|---|---|
| Market overview (`/`) | KPIs, 24h fallers/risers, new price lows, latest changes, brand moves, Market Watch table with search, brand/concentration filters, sorting on every column, pagination |
| Catalogue (`/perfumes`) | Card grid with the same search/filters, sort presets, pagination |
| Product terminal (`/perfumes/[slug]`) | Offers from every retailer (price, 'was' price, claimed discount, shipping, total, stock, last check, link), cheapest offer detection, interactive chart (24H–ALL, zoom/pan, crosshair tooltip, per-retailer comparison), period min/max/avg/change, price-change log with sort + retailer filter |
| PLN / EUR | Header toggle (cookie). Static FX rate from `EUR_PLN_RATE` |
| Data engine core | Adapter interface, validation (zod), dedupe, product matching, change detection, plausibility quarantine, retry, job log, stats recompute — exercised by `npm run engine:demo-tick` |
| SEO | Per-product metadata, canonical, Open Graph, `sitemap.xml`, `robots.txt`, JSON-LD (offers are withheld while prices are demo) |
| Tests | 23 unit tests: matching, change detection, series maths, money |

## Not built yet (and not pretended)

- **Real price sources.** Zero. See "Data-source risk" below — this is the project's critical path.
- Scheduler/queue (BullMQ + Redis), rate limiter, per-source intervals — Phase 2. Today ingest is run by a script.
- Accounts, watchlist, alerts, notifications — Phase 3. Tables exist in the schema; nothing writes to them.
- Deals page, Brand explorer, Retailer comparison, Admin panel — Phase 4. Unmatched listings are already stored as `PENDING_REVIEW` for the future review queue.
- Polish locale: strings live in `src/i18n/en.ts`; adding `pl.ts` + a locale switch is the remaining work. Client-component strings (chart, data table) are not yet routed through the dictionary.
- Product photos: placeholder glyphs only (no licensed image source).
- Unknown product URLs return the not-found page with `noindex` but HTTP 200 (streamed response), not a hard 404.

## Run it

Requires Node 22+ and PostgreSQL 16 (Docker compose file included).

```bash
cp .env.example .env
npm install
npm run db:up          # or point DATABASE_URL at any PostgreSQL
npm run db:migrate
npm run db:seed        # DEMO market: 52 fragrances, 8 retailers, history since 2026-05-01
npm run dev            # http://localhost:3000
```

Other commands: `npm run typecheck`, `npm test`, `npm run build`, `npm run engine:demo-tick`
(runs every retailer adapter once through the real ingest pipeline), `npm run db:reset`.

## Architecture

```
prisma/schema.prisma        data model (+ migrations/, seed.ts)
src/engine/                 DATA ENGINE — no UI imports
  types.ts                  RawOffer (the standard adapter output) + RetailerAdapter interface
  adapters/                 one file per source; index.ts is the registry (only `demo` today)
  matching.ts               EAN → brand+line+concentration+volume → else manual review
  transition.ts             change detection + plausibility rule (pure)
  ingest.ts                 fetch→validate→dedupe→match→detect→store→recompute, writes ScraperJob
  stats.ts                  per-product aggregates (ProductStats)
  demo/                     deterministic synthetic market (catalogue + simulator)
src/lib/                    db client, money, formatting, series maths, read queries
src/app/                    Next.js App Router pages + /api/products/[slug]/history
src/components/             UI (server components by default; chart/table/toggle are client)
tests/                      vitest
```

Decisions and why:

- **One Next.js app + PostgreSQL, engine as a plain TS module.** The engine has no framework
  dependency, so in Phase 2 it moves into a worker process (BullMQ on Railway/Render/VPS) without
  a rewrite; the web app stays on Vercel. A separate backend service now would be cost with no benefit.
- **Money = integer minor units + currency.** No floats in storage. Aggregates are kept in a PLN base.
- **History model.** `PriceSnapshot` is written when price/stock changes or once per UTC day as a
  heartbeat (≈1 row per offer per day, not per check). `PriceChange` records each detected move.
  Charts are step functions built from snapshots — a price holds until the next observation.
- **`ProductStats` is denormalised** (lowest/avg/highest, 24h/7d/30d change, 30-day and tracked
  lows) and recomputed after ingest, so the market table sorts and paginates in SQL.
- **Claimed discount ≠ real drop.** A store's struck-through price is stored and shown as
  "claimed". "30-day low" / "record low" come only from our own stored history.
- **Matching never guesses.** Concentration and volume are part of product identity. A listing
  missing either goes to `PENDING_REVIEW` and is excluded from prices until a human links it.
- **Lightweight Charts** over Recharts: purpose-built for financial time series (zoom, crosshair).
- **Prisma 6 / Tailwind 4 / hand-written components.** shadcn/ui was not pulled in: the handful of
  primitives needed are ~100 lines and carry no dependency.

## Connecting a real retailer (Phase 2)

1. Implement `RetailerAdapter` in `src/engine/adapters/<name>.ts`, returning `RawOffer[]`.
2. Register it in `src/engine/adapters/index.ts`.
3. Create the `Retailer` row with that `adapterKey` and the true `sourceKind`.
4. Disable/delete the demo retailers so synthetic and real prices never mix.

## Data-source risk (read before investing more time)

| Source type | Reality | Verdict |
|---|---|---|
| Affiliate product feeds (Awin, CJ, TradeDoubler, Notino/Douglas/Flaconi programmes) | Legal, structured, include EAN + price + URL. Require an approved publisher account with a live site; refresh is typically daily, not minutes | **Primary path** |
| Official retailer APIs | Not publicly offered by Sephora/Douglas/Notino for price data | Don't plan on it |
| Ceneo / Idealo | Aggregators; their terms generally forbid re-aggregating their data | Partnership only |
| Scraping public pages | Most large retailers run anti-bot protection and prohibit it in their terms; bypassing it is out of scope by design | Only where robots.txt and terms permit |
| Schema.org structured data | Good quality where pages are fetchable, same access constraints as scraping | Supplementary |

Consequences: no history exists before the day a source is connected (start collecting early);
refresh will be hours-to-daily for feed sources, so the UI always states "last checked", never
"real-time"; EAN coverage in feeds decides how much manual matching is needed.

## Roadmap

- **Phase 2 — price engine:** first affiliate-feed adapter, BullMQ scheduler with per-source intervals and rate limits, FX rates feed, source health monitoring.
- **Phase 3 — users:** Auth.js, watchlist, price alerts, in-app notifications.
- **Phase 4 — expansion:** Deals, Brand explorer, Retailer comparison, Admin (match review, job log, manual runs), email/Telegram, Polish locale.
