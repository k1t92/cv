# SCENTEX — data sources audit

_Last reviewed: 2026-11-15. Scope: how real perfume prices for Poland / the EU can be obtained legally._

## Bottom line

| | |
|---|---|
| Live **retailer price** sources connected | **0** |
| Live reference data connected | **1** — NBP exchange rates (EUR/PLN) |
| Blocking item | No affiliate-network publisher account exists yet. Every realistic retailer feed sits behind one. |

No retailer currently feeds real prices into SCENTEX. The import machinery is built and tested
against each feed layout, so connecting a retailer is a configuration step (feed URL + layout in
`/admin`) once access exists — but that access has to be obtained by the project owner.

## How this audit was done, and its limits

- **Web research** on network documentation and affiliate directories (sources at the bottom).
  Directory sites are third-party and sometimes contradict each other; anything taken from them is
  marked _directory claim_ and must be confirmed inside the network's own interface.
- **Direct technical verification was possible for one source only (NBP).** The development
  environment blocks outbound traffic by default; the hosts needed for checks were allow-listed, but
  automated requests to retailers' catalogue endpoints were additionally refused by the
  environment's safety policy as unauthorised access. That refusal was respected, not worked around.
  Consequently **no retailer endpoint, robots.txt or feed was fetched**, and nothing below claims otherwise.
- No affiliate account was available, so no feed column list, EAN coverage or refresh rate could be
  measured. Those cells say "unverified".

Legend — **Access**: ✅ connected · 🔑 needs an account/approval we don't have · 🤝 needs a direct agreement · ⛔ not a viable path · ❔ not researched.

## Reference data

| Source | What | Access | Verified | Notes |
|---|---|---|---|---|
| **NBP Web API** (`api.nbp.pl`, table A) | EUR/PLN mid rate, business days | ✅ **LIVE** | Yes — fetched and stored (`ExchangeRate`), shown in footer and `/admin` | Official, free, no key. Refreshed by the worker every 6 h. Replaced the static rate used in Phase 1 (4.25 → 4.4070 on 2026-11-13). |

## Affiliate networks (the primary path)

| Network | Feed mechanism | What is needed | Confidence |
|---|---|---|---|
| **Awin** | "Create-a-Feed" builds a download URL (`productdata.awin.com/datafeed/…/apikey/<key>`), CSV/XML, optionally gzip. A separate Publisher Product API serves "enhanced" feeds as JSON Lines with a token. | Approved Awin **publisher** account, then **joining each advertiser's programme**. A newly joined advertiser can take up to an hour to appear. | Verified from Awin's own documentation |
| **CJ Affiliate** | Product feeds via the CJ account (HTTP/FTP export; a product search API also exists) | Approved publisher account + per-advertiser approval | General knowledge, not re-verified in this audit |
| **TradeDoubler** | Product feeds per programme via a token-based products API / feed URL | Approved publisher account + per-programme approval | General knowledge, not re-verified in this audit |
| **VIVnetworks / MyLead** | Named by directories as routes into Notino for CEE storefronts | Account + approval | Directory claim |

Typical publisher-approval requirement across networks: a live website describing how traffic
will be sent. **SCENTEX therefore has to be deployed publicly before applying.** Showing only
demo data on that site would be a weak application and, if not labelled, a misleading one.

## Retailers

| Retailer | Market | Route found | Feed / EAN / price / deep link | Access | Basis |
|---|---|---|---|---|---|
| **Notino** | PL + ~25 EU storefronts | Runs a "Creator & Affiliate Program" (page exists on notino.pl). Directories name CJ Affiliate for the European portfolio and VIVnetworks / MyLead for CEE storefronts. | One directory states XML product feeds are supported. Polish-specific feed, EAN coverage: unverified | 🔑 | Official page exists; network + feed are directory claims. **Which network serves notino.pl is not confirmed.** |
| **Douglas** | DE, PL, others | Directories: mainly Awin, with CJ/TradeDoubler in some regions. One directory says Germany only. | Directories say feeds are available through Awin. PL programme, EAN: unverified | 🔑 | Directory claims, mutually inconsistent on country coverage |
| **Flaconi** | DE (also PL/AT storefronts) | One directory lists the German programme on Awin | Unverified | 🔑 | Single directory listing |
| **Sephora** | PL, FR, DE, others | Fragmented per country: US on Rakuten (or Impact); SE listed on Awin; CZ on CJ; DE listed by one directory. **Nothing found for sephora.pl.** | Unverified | 🔑 / ❔ for PL | Directory claims |
| **Marionnaud** | FR, others | — | — | ❔ | Not researched in this pass |
| **Perfumeria.pl** | PL | — | — | ❔ | Not researched in this pass |
| **E-Glamour** | PL | — | — | ❔ | Not researched in this pass |
| **Independent / niche perfumeries** (many run on standard shop platforms that can export Google-Shopping or Ceneo XML) | PL, EU | Ask the shop directly for its existing comparison-engine feed | Such feeds normally carry price, URL, availability and often EAN | 🤝 | General knowledge. No specific shop was contacted or probed. |
| **Ceneo** | PL | Price-comparison aggregator | — | ⛔ as a data source; 🤝 only by agreement | Re-publishing an aggregator's data needs its consent; terms were not reviewed in this audit |
| **Idealo** | DE/EU | Price-comparison aggregator | — | ⛔ / 🤝 | Same as Ceneo |

### Paths deliberately not taken

- **Scraping retailer pages or undocumented catalogue endpoints without permission.** Large
  retailers generally prohibit it and protect against it; the project rules forbid bypassing
  protections; and this environment refused such requests outright.
- **Inventing adapters for stores we cannot access.** There is no `SephoraAdapter`, `DouglasAdapter`
  etc. The code has feed *layout* presets (Awin CSV, Google Shopping XML, Ceneo XML, Shopify JSON,
  generic CSV), each tested against a synthetic fixture, and no retailer rows other than demo ones.

## Integration plan

| # | Step | Owner | Unblocks |
|---|---|---|---|
| 1 | Deploy SCENTEX publicly (web on Vercel, PostgreSQL, worker on Railway/Render/VPS) with its own domain | Owner | Affiliate applications |
| 2 | Register as an **Awin** publisher; apply to Douglas and Flaconi (and check the advertiser directory for other PL fragrance retailers) | Owner | First feeds |
| 3 | Register with **CJ** (and check VIVnetworks) for **Notino**; confirm which network serves notino.pl | Owner | The largest PL online perfume retailer |
| 4 | In Awin → Toolbox → Create-a-Feed, build a feed with the columns listed under "Awin product feed" in `/admin/sources/new`; paste the URL into a new source, **Run now**, review rejects and the match queue, then enable | Owner + dev | **First live prices** |
| 5 | Measure on the real feed: EAN coverage, refresh time, share of rows auto-matched. Add EANs to `Product` from the feed to raise auto-matching | Dev | Matching quality |
| 6 | Email 5–10 independent PL perfumeries asking for their Ceneo/Google feed URL in exchange for referral traffic | Owner | Coverage beyond the big chains without a network |
| 7 | Once ≥1 live source runs: disable demo sources in `/admin` (LIVE becomes the default view automatically as soon as a live source is enabled) | Owner | Clean production |

Expected characteristics once connected (to be confirmed on real data): affiliate feeds usually
regenerate about once a day, so SCENTEX will show daily price points, not intraday ones; history
begins on the day of the first import.

## Compliance notes

- Use each feed under the terms of the programme that provides it; affiliate deep links must be
  kept intact (they are stored and used as the offer link).
- The site must disclose affiliate relationships once such links are live.
- Secrets: an auth header is read from an environment variable named on the source; it is never
  stored in the database. A feed URL that embeds an API key *is* stored in the database — restrict
  database access accordingly.

## Sources

- Awin — How can I access a Product Feed: https://success.awin.com/articles/en_US/Knowledge/How-can-I-access-a-Product-Feed
- Awin — Product Data Feed FAQ: https://success.awin.com/articles/en_US/Knowledge/Product-Data-Feed-FAQ
- Awin wiki — Product Feed List Download: https://wiki.awin.com/index.php/Product_Feed_List_Download
- Awin developer docs — Publisher product API: https://developer.awin.com/apidocs/retail-publisher-productapidocumentation-1
- Notino — affiliate programme page: https://notino.pl/affiliate-program/
- Directory listings (third-party, unverified): https://uppromote.com/affiliate-directory/notino/ · https://uppromote.com/affiliate-directory/douglas/ · https://www.affilitizer.com/programs/sephora.cz · https://www.flexoffers.com/affiliate-programs/notino-affiliate-program/
- NBP Web API: https://api.nbp.pl/
