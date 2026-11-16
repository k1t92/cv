# SCENTEX — perfume price exchange

A price-tracking terminal for fragrances: lowest current price across retailers, stored price
history, real price drops vs. store-claimed discounts. Target markets: Poland first, then the EU.

> **Status: first real prices.** 52 live offers from the public product pages of two Polish shops are in
> the database (45 perfumeria.pl, 7 e-glamour.pl) and shown in LIVE mode. Only perfumeria.pl is being
> collected; e-glamour.pl refused requests and is paused; Sephora, Douglas, Notino, Flaconi and Marionnaud
> refuse automated access and are not collected. There is one day of data and **no product yet has prices
> from two shops**. Details: [LIVE_DATA_REPORT.md](LIVE_DATA_REPORT.md), [DATA_SOURCE_AUDIT.md](DATA_SOURCE_AUDIT.md),
> affiliate-feed route: [DATA_SOURCES.md](DATA_SOURCES.md).

## Public price collection

- `npm run sources:sync` registers the audited sources (disabled). Only sources that passed the audit carry a
  collection config (`src/engine/crawl/stores.ts`); the others are listed with the reason they are off.
- The `public` adapter reads robots.txt (obeys Disallow and Crawl-delay), discovers product pages from the
  shop's own sitemaps, fetches a small batch per run with conditional requests at ≥ 2 s spacing, and extracts
  schema.org Product/Offer JSON-LD (Open Graph as fallback). It executes no page scripts and reads no reviews.
- A 401/403 or an anti-bot challenge **stops the run, keeps what was already read, disables the source** and
  records who refused. Re-enabling takes two explicit admin steps. Nothing is retried around a refusal.
- Scheduled runs require `BOT_CONTACT` (email or URL placed in the User-Agent).
- Offers older than 72 h are marked stale and stop counting as the lowest price; paused sources stay visible, labelled.
- New products are created automatically only when nothing is guessed: tracked brand, valid barcode, stated
  concentration and volume. Everything else waits in `/admin/matches`.
- `/sources` shows every live source and its state to visitors.

## DEMO vs LIVE

- A source (`Retailer`) is **DEMO** when `sourceKind = DEMO`, otherwise **LIVE**.
- Aggregates are stored per mode (`ProductStats` key = product + mode); offers, charts, change logs
  and every query filter by mode. A page or API response contains one mode only — never a mix.
- The site shows **LIVE** by default as soon as one live source is enabled. While none exists it
  defaults to DEMO under a gold "DEMO DATA" banner. The header switch lets a visitor choose; LIVE
  with no source shows empty states, not demo numbers.
- `GET /api/products/{slug}/history?range=1M&currency=PLN&mode=live|demo` returns `"mode"` in the payload.
- Product JSON-LD carries offers only in LIVE mode.

## What works today

| Area | State |
|---|---|
| Market overview, catalogue, product terminal | As in Phase 1, now mode-aware with LIVE / DEMO badges |
| Feed importer | CSV / XML / JSON / JSON Lines, gzip, auto delimiter + record detection, field-mapping presets: Awin CSV, Google Shopping XML, Ceneo XML, Shopify JSON, generic CSV. Per-source include/exclude regex and field overrides |
| Generic `feed` adapter | A retailer with a product feed is connected in `/admin` with no code |
| Quality control | Schema validation, currency must equal the source's, dedupe by listing id, implausible single-step moves quarantined, 'was' price ≤ price dropped, run aborted if the feed shrinks >50%, vanished listings marked unavailable, rejects counted per run |
| Scheduler | `npm run worker`: runs due sources each minute (per-source interval, exponential back-off after failures, PostgreSQL advisory lock against double runs), refreshes FX every 6 h |
| FX | Live NBP table A rates stored with history (`ExchangeRate`) |
| Admin (`/admin`) | Token login; sources with status / last + next run / offer and match counts; add, edit, enable, disable, run now, delete with history; import log; FX refresh; match-review queue (link, create product, reject) |
| Tests | 135 unit tests + 9 database-backed integration tests (`npm run test:all`) |

## Not built yet (and not pretended)

- **A second working source, and any price history.** One shop, one day.
- End-to-end import of a real *feed* (affiliate route) has still never run. Each layout is covered by unit tests on
  synthetic fixtures; column names for Awin/Ceneo come from their public documentation and may need
  adjusting on first contact with a real file (per-source field overrides exist for that).
- Feeds are parsed in memory (250 MB cap). Multi-GB feeds would need a streaming parser.
- Redis/BullMQ: deliberately not used. One worker with PostgreSQL state is enough until several workers are needed.
- Accounts, watchlist, alerts — Phase 3. Deals page, brand explorer, retailer comparison — Phase 4.
- Polish locale, product photos, hard 404 status for unknown products — unchanged from Phase 1.
- Admin auth is a single shared token; no per-user accounts or audit trail.

## Run it

Requires Node 22+ and PostgreSQL 16 (Docker compose file included).

```bash
cp .env.example .env
npm install
npm run db:up          # or point DATABASE_URL at any PostgreSQL
npm run db:migrate
npm run db:seed        # optional DEMO market: 52 fragrances, 8 demo retailers (refuses to run if live sources exist)
npm run engine:fx      # fetch live EUR/PLN rates from NBP
npm run dev            # http://localhost:3000   (admin: /admin, needs ADMIN_TOKEN in .env)
npm run worker         # scheduler: imports due sources, refreshes FX
```

Other commands: `npm run typecheck`, `npm test`, `npm run test:integration` (uses a separate `scentex_test`
schema), `npm run build`, `npm run engine:run [-- <slug>]` (run all sources, or one, immediately),
`npm run engine:replay -- <slug>` (re-ingest stored extractions, no requests), `npm run report:live`, `npm run db:reset`.

Behind a mandatory outbound proxy set `NODE_USE_ENV_PROXY=1` (NBP rates) and `SCENTEX_USE_EGRESS_PROXY=1`
(feeds and page collection). Without a proxy the collector connects directly and pins the DNS-validated address.

## Architecture

```
prisma/schema.prisma        data model (+ migrations/, seed.ts)
src/engine/                 DATA ENGINE — no UI imports
  types.ts                  RawOffer (the standard adapter output) + RetailerAdapter interface
  adapters/                 registry: `feed` (any CSV/XML/JSON feed, configured in /admin) and `demo`
  feeds/                    fetch (gzip, auth header), parse, field-mapping presets, record → RawOffer
  crawl/                    robots.txt, sitemap, structured-data extraction, audited store profiles
  scheduler.ts, fx.ts       due-source runner with back-off + locking; NBP rates
  matching.ts               EAN → brand+line+concentration+volume → else manual review
  transition.ts             change detection + plausibility rule (pure)
  ingest.ts                 fetch→validate→dedupe→match→detect→store→recompute, writes ScraperJob
  stats.ts                  per-product aggregates (ProductStats)
  demo/                     deterministic synthetic market (catalogue + simulator)
src/lib/                    db client, money, fx, data mode, formatting, series maths, read queries, admin auth
src/app/admin/              admin panel (server actions)
scripts/                    worker, manual run, FX refresh
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

## Connecting a real retailer

1. Obtain a feed you are entitled to use (affiliate programme or the retailer's own export) — see DATA_SOURCES.md.
2. `/admin` → **Add source**: name, country, currency, feed URL, layout. It is created disabled.
3. **Run now**. Check the import log (rejected / unmatched) and work through **Match review**.
4. **Enable** it; the worker takes over. Disable the demo sources when you no longer want them.

A source with a bespoke API (not a feed) implements `RetailerAdapter` in `src/engine/adapters/` and
is registered in `index.ts`; nothing else in the core changes.

## Roadmap

- **Phase 2 — remaining:** obtain feed access and run the first live import (owner action, see DATA_SOURCES.md); then tune mappings and EAN coverage on real data.
- **Phase 3 — users:** Auth.js, watchlist, price alerts, in-app notifications.
- **Phase 4 — expansion:** Deals, Brand explorer, Retailer comparison, Admin (match review, job log, manual runs), email/Telegram, Polish locale.
