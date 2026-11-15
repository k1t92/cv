/** Source-of-truth dictionary. A new locale is a file with the same shape (see README). */
export const en = {
  nav: { market: "Market", perfumes: "Perfumes", search: "Search fragrance or brand" },
  demo: {
    banner: "Demo data — prices are synthetic and are not quotes from the retailers named. No live source is connected yet.",
    tag: "DEMO",
  },
  home: {
    title: "Perfume market overview",
    tracked: "Tracked fragrances",
    retailers: "Retailers",
    discounts: "Offers with a claimed discount",
    newLows: "At a new 30-day low",
    lastUpdate: "Last data update",
    fallers: "Biggest price drops · 24h",
    risers: "Biggest price rises · 24h",
    bestDeals: "Best buys · new price lows",
    bestDealsHint: "Ranked by real change in the lowest price, not by the store's struck-through price.",
    recent: "Latest price changes",
    featured: "Featured fragrances",
    featuredHint: "Editorial selection — not a popularity ranking.",
    brands: "Brands · 7-day price move",
    brandsHint: "Average 7-day change of the lowest price across the brand's tracked fragrances.",
    marketWatch: "Market watch",
    none: "Nothing to show yet.",
  },
  table: {
    perfume: "Perfume", brand: "Brand", conc: "Conc.", volume: "Vol.", lowest: "Lowest", average: "Average",
    highest: "Highest", d1: "24h", d7: "7d", d30: "30d", cheapest: "Cheapest at",
    empty: "No fragrances match these filters.", reset: "Reset filters", apply: "Apply",
    allBrands: "All brands", allConc: "All concentrations", results: "results",
  },
  product: {
    lowestNow: "Lowest price now", offers: "Current offers", chart: "Price history", history: "Price change log",
    noOffers: "No retailer offers are linked to this fragrance yet.",
    noHistory: "No price changes recorded yet.",
    low30: "30-day low", lowAll: "Lowest since tracking began", outOfStock: "Out of stock everywhere",
    retailer: "Retailer", price: "Price", was: "Listed 'was' price", discount: "Claimed discount", shipping: "Shipping",
    total: "Total", stock: "Availability", checked: "Last checked", link: "Store",
    date: "Date", previous: "Previous", next: "New", change: "Change", changePct: "Change %",
  },
  footer: {
    fx: "Currency conversion uses a static configured rate",
    note: "SCENTEX tracks listed prices. Always confirm the final price at the retailer before buying.",
  },
} as const;

export type Dictionary = typeof en;
