# SCENTEX — public data source audit

_Audit performed 2026-11-15/16 from the development environment. Every "observed" cell is the result of a request that was actually made; nothing is inferred from how a platform "usually" behaves._

## Method and ground rules

- One identified client (`SCENTEX-bot/0.3 (perfume price comparison …)`), no browser emulation, no cookies, no JavaScript execution, no proxy rotation. The environment's single mandatory egress proxy was used because it is the only route out; it was not used to change identity or location on purpose (the CDN saw a US address).
- Order of checks per site: `robots.txt` → sitemap named in it → one product page. **The first refusal (HTTP 401/403, anti-bot challenge) ended the audit of that site.** No retry with other headers, no alternative entry points.
- Requests made in total across all sites during the audit and the two test collections: roughly 130, spaced 1–20 s apart.
- Terms of use were fetched for the two candidate shops and searched for clauses on automated access, robots, copying or databases. This is a keyword search by an engineer, **not legal advice**.

## Result

| Source | Status | robots.txt | Sitemap | Product page | JSON-LD Product/Offer | Price + currency | GTIN | Volume / concentration | Discount / 30-day low | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| **perfumeria.pl** | **PUBLIC_ACCESS_SUPPORTED** | 200; `Allow: /` for `*`, product pages allowed; no Crawl-delay | 200; index of ~84 product sitemaps (Shopify) | 200 (37 of 37 requested) | Yes | Yes, PLN | Yes, `gtin13` on every offer seen | In the product name; variant sizes only in inline storefront data | Not in structured data | 45 offers stored |
| **e-glamour.pl** | **PARTIALLY_SUPPORTED** (currently paused) | 200; only account and GraphQL paths disallowed | 200; 7 product sitemaps of 2 500 URLs | 200 for 7 pages, then **HTTP 403 from the CDN** (three times, at 3 s, 5 s and 20 s spacing) | Yes | Yes, PLN, plus shipping rate | Yes, `gtin13` | In the product name | Not in structured data | 7 offers stored; source auto-disabled |
| douglas.pl | RESTRICTED | 200; product pages not disallowed; `/datafeed/` disallowed | 200; 50 000 URLs in the first product sitemap | **HTTP 403** | not reachable | — | — | — | — | Stopped after the 403 |
| notino.pl | RESTRICTED | 200; product pages not disallowed; Crawl-delay 4 for named bots | **HTTP 403, Cloudflare "Just a moment…" challenge** | not requested | — | — | — | — | — | Stopped at the challenge |
| sephora.pl | RESTRICTED | **HTTP 403 "Access Denied" (Akamai)** | — | — | — | — | — | — | — | Refused at robots.txt |
| sephora.fr | RESTRICTED | **HTTP 403 "Access Denied" (Akamai)** | — | — | — | — | — | — | — | Refused at robots.txt |
| sephora.de | RESTRICTED | **HTTP 403 "Access Denied" (Akamai)** | — | — | — | — | — | — | — | Refused at robots.txt |
| marionnaud.fr | RESTRICTED | **HTTP 403 "Access Denied" (Akamai)** | — | — | — | — | — | — | — | Refused at robots.txt |
| flaconi.de | RESTRICTED | **HTTP 403, Cloudflare challenge** | — | — | — | — | — | — | — | Refused at robots.txt |
| ceneo.pl | REQUIRES_PARTNERSHIP | 200; `Crawl-Delay: 120`; 453 Disallow lines; many bots banned by name | not requested | not requested | — | — | — | — | — | Aggregator: re-publishing its data needs its consent |
| douglas.de | NOT_VERIFIED | 200; same shape as douglas.pl | not requested | not requested | — | — | — | — | — | Not pursued after douglas.pl refused product pages |
| notino.de | NOT_VERIFIED | 200; identical to notino.pl | not requested | not requested | — | — | — | — | — | Not pursued after notino.pl answered with a challenge |
| marionnaud.com and other local versions | NOT_VERIFIED | not requested | — | — | — | — | — | — | — | Only marionnaud.fr was tested |

Not found anywhere in structured data: the EU "lowest price in the last 30 days" figure. Neither permitted shop publishes it in JSON-LD, so it is not collected; SCENTEX computes its own 30-day low from stored history instead.

## What the two usable sources allow, and the caveats

**perfumeria.pl** — robots.txt permits product pages; the shop's terms (`/pages/regulamin`) contain no clause on automated access. They do prohibit "actions disrupting the functioning of the Service", which is why collection is capped at one request per 5 s and a few dozen pages per run.

**e-glamour.pl** — robots.txt permits product pages and the terms (`/regulamin-sklepu`) contain no clause on automated access, **but the shop's CDN refused requests after a handful of pages on three separate occasions.** That is a technical access restriction. SCENTEX reacted as designed: it stopped, kept the 7 prices already read, and disabled the source. It has not been re-enabled. Realistic ways forward are to ask the shop (they may allow-list the bot or offer a feed) or to obtain its feed through an affiliate programme — not to keep probing.

**Legal caveats that apply to both, and that this audit cannot settle:**

1. *Database right (Directive 96/9/EC).* Systematically extracting a substantial part of a shop's catalogue can infringe the maker's sui generis right even when every page is public and robots.txt allows crawling. SCENTEX currently limits itself to fragrances of 15 tracked brands and stores only facts (name, barcode, price, stock state, URL) — no descriptions, no reviews, no images are copied. Whether that is "insubstantial" is a legal question.
2. *robots.txt is not consent.* It is the shop's stated preference for crawlers; it does not override terms of use.
3. *No contact was made with either shop.* Before production use, write to both and ask. A "yes" removes most of the risk; a "no" must be honoured.
4. The audit was run without a contact address in the User-Agent, because no project contact exists yet. Scheduled collection refuses to start until `BOT_CONTACT` is set.

## Checks to repeat from a normal server

The development environment reaches the internet only through one egress proxy that also resolves DNS, so two protections could not be exercised end to end against real sites (they are covered by tests against a local server):

- direct connection with the destination address pinned after DNS validation (anti-rebinding);
- behaviour from a European address: the CDN that refused requests saw a US one, which may itself be part of the reason.

On a production host: run `npm run sources:sync`, set `BOT_CONTACT`, enable perfumeria.pl only, run `npm run engine:run -- live-perfumeria-pl` twice, and compare the result with `LIVE_DATA_REPORT.md`.
