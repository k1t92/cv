# SCENTEX — live data report

_Generated 2026-11-16 from the development database by `npm run report:live`. The tables below are query output; the commentary around them is written by hand._

## Summary

- **52 real offers** are stored, read from the public product pages of two Polish shops: **45 from perfumeria.pl** (collection running) and **7 from e-glamour.pl** (collection stopped after the shop's CDN answered HTTP 403).
- **51 are matched** to a product and shown on the site; **1 is in manual review** and takes part in no price.
- **No product is yet offered by both shops**, so there is no real cross-store price comparison yet — only single-store prices.
- **Every offer has exactly one price snapshot.** There is no price history yet: charts show a single observed price, and "24h / 7d / 30d change" is empty. History starts accumulating with the next daily runs.
- 27 of the 51 matched offers were not in stock when read.

## How the numbers were verified

| Check | How | Result |
|---|---|---|
| Idempotency | All stored extractions were re-ingested three times in a row (`npm run engine:replay`) | Runs 2 and 3: 104 offers submitted, 0 rows created or changed; offers 52 → 52, snapshots 52 → 52 |
| No duplicate listings | `GROUP BY retailer, listing id HAVING count > 1` | 0 (also enforced by a unique index) |
| No duplicate snapshots | `GROUP BY offer, timestamp HAVING count > 1` | 0 |
| Barcodes | GS1 check digit recomputed for every stored EAN | 52 of 52 valid |
| Product identity | Brand, name, concentration and volume present on every matched product | 51 of 51 |
| Timestamps | Each offer carries the fetch time of its own page | 3 distinct fetch times (see table) |
| DEMO / LIVE separation | LIVE aggregates referencing a demo retailer | 0; integration test covers offers, aggregates, lists and chart API |
| Website | Driven in a browser: LIVE home, two product pages, chart API in three modes, sources page | Only live retailers appear in LIVE; offer links go to the shops' product pages; paused source is labelled |

## Defects found and fixed while producing this report

These were real, found on real data, and are listed because they would otherwise have corrupted the dataset:

1. **Different fragrances merged.** "Tom Ford Noir" was attached to "Noir Pour Femme"; "Le Parfum" and "Pour Homme" were stripped from names as noise. Matching now keeps such words; regression tests added.
2. **Listings with the same barcode overwrote each other.** Listing identity is now page + variant, not the barcode.
3. **A re-import overstated freshness.** Replaying stored data stamped every offer with the newest fetch time and added snapshots. Ingest now refuses any observation that is not newer than the stored one.
4. **Sizes missing for multi-variant pages.** Read from the shop's inline variant data; before the fix 17 of 36 offers went to manual review, now 1 of 52.
5. **An unboxed-stock listing was treated as the retail product.** Testers, unboxed items, sets and refills are now excluded.
6. **A gzip bomb passed the download limit** (found by a test, before any real download).

## Known limitations of this dataset

- One day of data, one working source. This is a proof that the pipeline works on real pages, not a market view.
- The single offer in manual review is a page whose URL says "prada-l-homme-intense" while its content is a Lacoste product — the shop reused the address. It was correctly not linked.
- 49 products were created automatically from listings (brand tracked, valid barcode, concentration and volume stated). Their display names come from the shop's wording (e.g. "L´Homme" with the shop's accent character) and have not been editorially reviewed.
- Prices are what the page published at fetch time. No "was" price or 30-day-low figure is available in either shop's structured data, so none is stored.
- Collected through a US egress address without a contact in the User-Agent; see DATA_SOURCE_AUDIT.md.

## Totals (queried from the database)

| Metric | Value |
| --- | --- |
| Unique products with at least one matched live offer | 51 |
| Products offered by two or more live stores | 0 |
| Unique live offers (listings) | 52 |
| — matched to a product | 51 |
| — of those in stock | 24 |
| Price snapshots stored for live offers | 52 |
| Price changes recorded for live offers | 0 |
| Offers matched by EAN / GTIN | 49 |
| Offers matched by normalised brand + name + concentration + volume | 2 |
| Offers matched manually | 0 |
| Offers in manual review (excluded from all prices) | 1 |
| Offers rejected by a reviewer | 0 |
| Offers rejected as invalid by schema / currency / plausibility checks (all runs) | 0 |
| Live offers carrying a barcode with a valid check digit | 52 of 52 |
| Matched offers whose product has brand, name, concentration and volume | 51 of 51 |
| Duplicate listing keys (retailer + listing id) in the database | 0 |
| Duplicate snapshots (same offer, same timestamp) in the database | 0 |
| LIVE aggregates pointing at a DEMO retailer | 0 |
| Import runs recorded for live sources | 28 |
| EUR/PLN reference rate in use | 4.407 (NBP, 2026-11-13) |

## Sources

| Source | Host | State | Access status | Offers | Pages by extraction status | Last price check |
| --- | --- | --- | --- | --- | --- | --- |
| live-perfumeria-pl | www.perfumeria.pl | collecting | PUBLIC_ACCESS_SUPPORTED | 45 | NOT_FRAGRANCE 2, OK 35 | 2026-11-16T07:13:58Z |
| live-ceneo-pl | www.ceneo.pl | not collected | REQUIRES_PARTNERSHIP | 0 | — | — |
| live-douglas-de | www.douglas.de | not collected | NOT_VERIFIED | 0 | — | — |
| live-douglas-pl | www.douglas.pl | not collected | RESTRICTED | 0 | — | — |
| live-e-glamour-pl | www.e-glamour.pl | paused 2026-11-15T21:16:28Z | RESTRICTED | 7 | OK 7, PENDING 486 | 2026-11-15T21:13:56Z |
| live-flaconi-de | www.flaconi.de | not collected | RESTRICTED | 0 | — | — |
| live-marionnaud-fr | www.marionnaud.fr | not collected | RESTRICTED | 0 | — | — |
| live-notino-de | www.notino.de | not collected | NOT_VERIFIED | 0 | — | — |
| live-notino-pl | www.notino.pl | not collected | RESTRICTED | 0 | — | — |
| live-sephora-de | www.sephora.de | not collected | RESTRICTED | 0 | — | — |
| live-sephora-fr | www.sephora.fr | not collected | RESTRICTED | 0 | — | — |
| live-sephora-pl | www.sephora.pl | not collected | RESTRICTED | 0 | — | — |

## Every live offer

Timestamps are the moment the page was fetched (UTC). Prices are as published by the store.

| Source | Listing title (as published) | EAN | Price | Stock | Match | Product | Checked (UTC) | URL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| e-glamour.pl | Chanel Chance EDT 100 ml W | 3145891264609 | 670.21 PLN | IN_STOCK | AUTO_EAN | Chanel · Chance · EDT · 100 ml | 2026-11-15T21:13:56Z | https://www.e-glamour.pl/chanel-chance-edt-100-ml-w_z378/ |
| e-glamour.pl | Giorgio Armani Acqua di Giò Pour Homme Woda toaletowa dla mężczyzn 100 ml | 3360372058878 | 244.00 PLN | IN_STOCK | AUTO_EAN | Giorgio Armani · Acqua di Giò Pour Homme · EDT · 100 ml | 2026-11-15T21:13:56Z | https://www.e-glamour.pl/giorgio-armani-acqua-di-gio-pour-homme-woda-toaletowa-dla-mezczyzn-100-ml_z301/ |
| e-glamour.pl | Giorgio Armani Acqua di Giò Pour Homme Woda toaletowa dla mężczyzn 200 ml | 3360372078500 | 326.37 PLN | IN_STOCK | AUTO_EAN | Giorgio Armani · Acqua di Giò Pour Homme · EDT · 200 ml | 2026-11-15T21:13:56Z | https://www.e-glamour.pl/giorgio-armani-acqua-di-gio-pour-homme-woda-toaletowa-dla-mezczyzn-200-ml_z303/ |
| e-glamour.pl | Jean Paul Gaultier Le Male Woda toaletowa dla mężczyzn 125 ml | 8435415012669 | 296.01 PLN | IN_STOCK | AUTO_ATTRIBUTES | Jean Paul Gaultier · Le Male · EDT · 125 ml | 2026-11-15T21:13:56Z | https://www.e-glamour.pl/jean-paul-gaultier-le-male-woda-toaletowa-dla-mezczyzn-125-ml_z410/ |
| e-glamour.pl | Versace Blue Jeans Man Woda toaletowa dla mężczyzn 75 ml | 8018365260757 | 64.48 PLN | IN_STOCK | AUTO_EAN | Versace · Blue Jeans Man · EDT · 75 ml | 2026-11-15T21:13:56Z | https://www.e-glamour.pl/versace-blue-jeans-man-woda-toaletowa-dla-mezczyzn-75-ml_z296/ |
| e-glamour.pl | Versace L´Homme Woda toaletowa dla mężczyzn 100 ml | 8018365140103 | 111.97 PLN | IN_STOCK | AUTO_EAN | Versace · L´Homme · EDT · 100 ml | 2026-11-15T21:13:56Z | https://www.e-glamour.pl/versace-l-homme-woda-toaletowa-dla-mezczyzn-100-ml_z631/ |
| e-glamour.pl | Versace Woman Woda perfumowana dla kobiet 50 ml | 8018365250260 | 84.50 PLN | IN_STOCK | AUTO_EAN | Versace · Woman · EDP · 50 ml | 2026-11-15T21:13:56Z | https://www.e-glamour.pl/versace-woman-woda-perfumowana-dla-kobiet-50-ml_z577/ |
| perfumeria.pl | Bleu de Chanel woda toaletowa spray 50 ml | 3145891074505 | 435.66 PLN | IN_STOCK | AUTO_EAN | Chanel · Bleu de Chanel · EDT · 50 ml | 2026-11-16T07:13:58Z | https://www.perfumeria.pl/products/chanel-bleu-de-chanel-woda-toaletowa-spray?variant=29450835263582 |
| perfumeria.pl | Chanel Allure Homme Edition Blanche woda perfumowana 100 ml | 3145891274608 | 627.02 PLN | IN_STOCK | AUTO_EAN | Chanel · Allure Homme Edition Blanche · EDP · 100 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/chanel-allure-homme-edition-blanche-woda-perfumowana-spray-1?variant=61033926852938 |
| perfumeria.pl | Chanel Allure Homme Edition Blanche woda perfumowana 150 ml | 3145891274707 | 695.24 PLN | OUT_OF_STOCK | AUTO_EAN | Chanel · Allure Homme Edition Blanche · EDP · 150 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/chanel-allure-homme-edition-blanche-woda-perfumowana-spray-1?variant=61033926885706 |
| perfumeria.pl | Chanel Allure Homme Edition Blanche woda perfumowana 50 ml | 3145891274509 | 461.00 PLN | IN_STOCK | AUTO_EAN | Chanel · Allure Homme Edition Blanche · EDP · 50 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/chanel-allure-homme-edition-blanche-woda-perfumowana-spray-1?variant=61033926820170 |
| perfumeria.pl | Chanel Allure woda perfumowana spray 100 ml | 3145891125306 | 665.90 PLN | OUT_OF_STOCK | AUTO_EAN | Chanel · Allure · EDP · 100 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/chanel-allure-woda-perfumowana-1?variant=50548700447050 |
| perfumeria.pl | Chanel Allure woda perfumowana spray 35 ml | 3145891124408 | 371.99 PLN | IN_STOCK | AUTO_EAN | Chanel · Allure · EDP · 35 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/chanel-allure-woda-perfumowana-1?variant=50548700381514 |
| perfumeria.pl | Chanel Allure woda perfumowana spray 50 ml | 3145891124309 | 547.01 PLN | IN_STOCK | AUTO_EAN | Chanel · Allure · EDP · 50 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/chanel-allure-woda-perfumowana-1?variant=50548700414282 |
| perfumeria.pl | Chanel Chance woda perfumowana 100 ml | 3145891265200 | 813.00 PLN | IN_STOCK | AUTO_EAN | Chanel · Chance · EDP · 100 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/chanel-chance-woda-perfumowana-spray?variant=29476188880990 |
| perfumeria.pl | Chanel Chance woda perfumowana 35 ml | 3145891264302 | 380.00 PLN | IN_STOCK | AUTO_EAN | Chanel · Chance · EDP · 35 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/chanel-chance-woda-perfumowana-spray?variant=64292052500810 |
| perfumeria.pl | Chanel Chance woda perfumowana 50 ml | 3145891264203 | 568.03 PLN | IN_STOCK | AUTO_EAN | Chanel · Chance · EDP · 50 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/chanel-chance-woda-perfumowana-spray?variant=64292052697418 |
| perfumeria.pl | Chanel Coco woda toaletowa spray 50ml | 3145891234503 | 379.00 PLN | OUT_OF_STOCK | AUTO_EAN | Chanel · Coco · EDT · 50 ml | 2026-11-16T07:13:58Z | https://www.perfumeria.pl/products/chanel-coco-woda-toaletowa-spray?variant=29451105796190 |
| perfumeria.pl | Dior Dune Pour Homme woda toaletowa spray 100 ml | 3348900321861 | 427.40 PLN | OUT_OF_STOCK | AUTO_EAN | Dior · Dune Pour Homme · EDT · 100 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/dior-dune-pour-homme-woda-toaletowa-spray?variant=50557747790154 |
| perfumeria.pl | Dior Eau Sauvage woda toaletowa spray 50ml | 3348900627505 | 318.12 PLN | OUT_OF_STOCK | AUTO_EAN | Dior · Eau Sauvage · EDT · 50 ml | 2026-11-16T07:13:58Z | https://www.perfumeria.pl/products/dior-eau-sauvage-woda-toaletowa-spray?variant=29451595841630 |
| perfumeria.pl | Dior Fahrenheit Le Parfum woda perfumowana spray 75ml | 3348901116817 | 504.98 PLN | IN_STOCK | AUTO_EAN | Dior · Fahrenheit Le Parfum · EDP · 75 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/dior-fahrenheit-parfum-perfumy-spray?variant=31148190203998 |
| perfumeria.pl | Dior Fahrenheit woda toaletowa spray 100 ml | 3348900012219 | 449.17 PLN | OUT_OF_STOCK | AUTO_EAN | Dior · Fahrenheit · EDT · 100 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/dior-fahrenheit-woda-toaletowa-spray?variant=50585823248714 |
| perfumeria.pl | Dior Fahrenheit woda toaletowa spray 200 ml | 3348900147324 | 648.23 PLN | IN_STOCK | AUTO_EAN | Dior · Fahrenheit · EDT · 200 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/dior-fahrenheit-woda-toaletowa-spray?variant=50585823281482 |
| perfumeria.pl | Dior Fahrenheit woda toaletowa spray 50 ml | 3348900012189 | 329.00 PLN | IN_STOCK | AUTO_EAN | Dior · Fahrenheit · EDT · 50 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/dior-fahrenheit-woda-toaletowa-spray?variant=50585823215946 |
| perfumeria.pl | Dior Forever and Ever woda toaletowa 50 ml | 3348900774056 | 409.00 PLN | OUT_OF_STOCK | AUTO_EAN | Dior · Forever and Ever · EDT · 50 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/dior-forever-and-ever-woda-toaletowa-spray-1?variant=60857831948618 |
| perfumeria.pl | Dior Homme Intense woda perfumowana spray 100ml | 3348900838185 | 550.00 PLN | IN_STOCK | AUTO_ATTRIBUTES | Dior · Dior Homme Intense · EDP · 100 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/dior-homme-intense-woda-perfumowana-spray?variant=29476195926110 |
| perfumeria.pl | Giorgio Armani Eau Pour Homme woda toaletowa 100 ml | 3605521544353 | 371.94 PLN | OUT_OF_STOCK | AUTO_EAN | Giorgio Armani · Eau Pour Homme · EDT · 100 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/giorgio-armani-eau-pour-homme-woda-toaletowa?variant=31148178604126 |
| perfumeria.pl | Jean Paul Gaultier Le Beau Male woda toaletowa spray 75ml | 3423474776757 | 187.00 PLN | OUT_OF_STOCK | AUTO_EAN | Jean Paul Gaultier · Le Beau Male · EDT · 75 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/jean-paul-gaultier-le-beau-male-woda-toaletowa-spray-75ml?variant=31362132443230 |
| perfumeria.pl | Lacoste L'Homme Intense woda toaletowa spray 100ml | 3614227365926 | 172.00 PLN | OUT_OF_STOCK | PENDING_REVIEW | — (manual review) | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/prada-l-homme-intense-woda-toaletowa-spray-100ml?variant=31520903397470 |
| perfumeria.pl | Prada L'Homme L'Eau woda toaletowa spray 100 ml | 8435137765362 | 240.29 PLN | OUT_OF_STOCK | AUTO_EAN | Prada · L'Homme L'Eau · EDT · 100 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/prada-l-homme-l-eau-woda-toaletowa?variant=51659326554442 |
| perfumeria.pl | Prada Luna Rossa Pour Homme woda toaletowa spray 50ml | 8435137729197 | 312.00 PLN | OUT_OF_STOCK | AUTO_EAN | Prada · Luna Rossa Pour Homme · EDT · 50 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/prada-luna-rossa-pour-homme-woda-toaletowa?variant=29453049790558 |
| perfumeria.pl | Tom Ford For Men woda toaletowa spray 50ml | 888066001021 | 302.00 PLN | OUT_OF_STOCK | AUTO_EAN | Tom Ford · For Men · EDT · 50 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/tom-ford-for-men-woda-toaletowa-spray?variant=29451912511582 |
| perfumeria.pl | Tom Ford Jasmin Rouge woda perfumowana spray 50ml | 888066012324 | 707.46 PLN | IN_STOCK | AUTO_EAN | Tom Ford · Jasmin Rouge · EDP · 50 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/tom-ford-jasmin-rouge-woda-perfumowana-spray?variant=29452720734302 |
| perfumeria.pl | Tom Ford Noir Pour Femme woda perfumowana spray 50ml | 888066034623 | 503.00 PLN | OUT_OF_STOCK | AUTO_EAN | Tom Ford · Noir Pour Femme · EDP · 50 ml | 2026-11-16T07:13:58Z | https://www.perfumeria.pl/products/tom-ford-noir-pour-femme-woda-perfumowana-spray?variant=29453614153822 |
| perfumeria.pl | Tom Ford Noir woda perfumowana spray 50ml | 888066015493 | 381.15 PLN | OUT_OF_STOCK | AUTO_EAN | Tom Ford · Noir · EDP · 50 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/tom-ford-noir-woda-perfumowana-spray?variant=29453614940254 |
| perfumeria.pl | Tom Ford White Patchouli woda perfumowana spray 50ml | 888066002509 | 560.00 PLN | OUT_OF_STOCK | AUTO_EAN | Tom Ford · White Patchouli · EDP · 50 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/tom-ford-white-patchouli-woda-perfumowana-spray?variant=29455029436510 |
| perfumeria.pl | Versace Bright Crystal Absolu woda perfumowana spray 50ml | 8011003818174 | 159.52 PLN | OUT_OF_STOCK | AUTO_EAN | Versace · Bright Crystal Absolu · EDP · 50 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/versace-bright-crystal-absolu-woda-perfumowana-spray?variant=29450927865950 |
| perfumeria.pl | Versace Crystal Noir woda perfumowana spray 50ml | 8018365070264 | 229.85 PLN | IN_STOCK | AUTO_EAN | Versace · Crystal Noir · EDP · 50 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/versace-crystal-noir-woda-perfumowana-spray?variant=29451358503006 |
| perfumeria.pl | Versace Crystal Noir woda toaletowa spray 90ml 90 ml | 8018365071469 | 272.01 PLN | IN_STOCK | AUTO_EAN | Versace · Crystal Noir · EDT · 90 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/versace-crystal-noir-woda-toaletowa-spray?variant=29476099162206 |
| perfumeria.pl | Versace Eros woda toaletowa spray 30ml | 8011003809196 | 137.60 PLN | OUT_OF_STOCK | AUTO_EAN | Versace · Eros · EDT · 30 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/versace-eros-men-woda-toaletowa-spray?variant=29451717115998 |
| perfumeria.pl | Versace Pour Femme Oud Oriental woda perfumowana 100 ml | 8011003818167 | 417.31 PLN | OUT_OF_STOCK | AUTO_EAN | Versace · Pour Femme Oud Oriental · EDP · 100 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/versace-pour-femme-oud-oriental-woda-perfumowana?variant=50566248923466 |
| perfumeria.pl | Yves Saint Laurent L'Homme Cologne Bleue woda toaletowa spray 100 ml | 3614271990013 | 289.00 PLN | OUT_OF_STOCK | AUTO_EAN | Yves Saint Laurent · L'Homme Cologne Bleue · EDT · 100 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/yves-saint-laurent-l-homme-cologne-bleue-woda-toaletowa-spray?variant=50586045808970 |
| perfumeria.pl | Yves Saint Laurent L'Homme Cologne Bleue woda toaletowa spray 60 ml | 3614271990020 | 231.00 PLN | OUT_OF_STOCK | AUTO_EAN | Yves Saint Laurent · L'Homme Cologne Bleue · EDT · 60 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/yves-saint-laurent-l-homme-cologne-bleue-woda-toaletowa-spray?variant=50586045776202 |
| perfumeria.pl | Yves Saint Laurent L'Homme Parfum Intense woda perfumowana spray 60ml | 3365440328341 | 296.00 PLN | OUT_OF_STOCK | AUTO_EAN | Yves Saint Laurent · L'Homme Parfum Intense · EDP · 60 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/yves-saint-laurent-l-homme-parfum-intense-woda-perfumowana-spray?variant=29452759433310 |
| perfumeria.pl | Yves Saint Laurent L'Homme woda toaletowa spray 100ml | 3365440316560 | 277.91 PLN | OUT_OF_STOCK | AUTO_EAN | Yves Saint Laurent · L'Homme · EDT · 100 ml | 2026-11-16T07:13:58Z | https://www.perfumeria.pl/products/yves-saint-laurent-l-homme-woda-toaletowa-spray?variant=29476115611742 |
| perfumeria.pl | Yves Saint Laurent L'Homme woda toaletowa spray 200ml | 3365440328761 | 418.00 PLN | IN_STOCK | AUTO_EAN | Yves Saint Laurent · L'Homme · EDT · 200 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/yves-saint-laurent-l-homme-woda-toaletowa-spray-200ml?variant=31362161082462 |
| perfumeria.pl | Yves Saint Laurent La Nuit de l'Homme Le Parfum woda perfumowana spray 60ml | 3365440621015 | 288.91 PLN | OUT_OF_STOCK | AUTO_EAN | Yves Saint Laurent · La Nuit de l'Homme Le Parfum · EDP · 60 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/yves-saint-laurent-la-nuit-de-l-homme-le-parfum-woda-perfumowana-spray?variant=29476145004638 |
| perfumeria.pl | Yves Saint Laurent Opium Pour Femme woda toaletowa spray 90ml | 3365440556386 | 344.77 PLN | IN_STOCK | AUTO_EAN | Yves Saint Laurent · Opium Pour Femme · EDT · 90 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/yves-saint-laurent-opium-woda-toaletowa-spray?variant=31148154421342 |
| perfumeria.pl | Yves Saint Laurent Opium Pour Homme woda toaletowa spray 100 ml | 3365440025578 | 420.00 PLN | OUT_OF_STOCK | AUTO_EAN | Yves Saint Laurent · Opium Pour Homme · EDT · 100 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/yves-saint-laurent-opium-pour-homme-woda-toaletowa-1?variant=50557685399882 |
| perfumeria.pl | Yves Saint Laurent Paris woda toaletowa 125 ml | 3365440002197 | 589.00 PLN | OUT_OF_STOCK | AUTO_EAN | Yves Saint Laurent · Paris · EDT · 125 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/yves-saint-laurent-paris-woda-toaletowa-1?variant=53308973580618 |
| perfumeria.pl | Yves Saint Laurent Paris woda toaletowa 75 ml | 3365440002173 | 244.46 PLN | OUT_OF_STOCK | AUTO_EAN | Yves Saint Laurent · Paris · EDT · 75 ml | 2026-11-15T21:22:30Z | https://www.perfumeria.pl/products/yves-saint-laurent-paris-woda-toaletowa-1?variant=53308973547850 |
| perfumeria.pl | Yves Saint Laurent Rive Gauche woda toaletowa spray 100 ml | 3365440246737 | 346.00 PLN | OUT_OF_STOCK | AUTO_EAN | Yves Saint Laurent · Rive Gauche · EDT · 100 ml | 2026-11-16T07:13:58Z | https://www.perfumeria.pl/products/yves-saint-laurent-rive-gauche-woda-toaletowa?variant=50557681893706 |
