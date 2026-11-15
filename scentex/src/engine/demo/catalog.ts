/**
 * DEMO catalogue. Brand / fragrance / size facts are real; every price derived from
 * `basePln` is synthetic and exists only to exercise the product end to end.
 */
import type { ConcentrationCode } from "../matching";

export interface DemoProduct {
  brand: string;
  name: string;
  concentration: ConcentrationCode;
  volumeMl: number;
  category: "Men" | "Women" | "Unisex";
  releaseYear?: number;
  /** Synthetic reference price in PLN. */
  basePln: number;
  featuredRank?: number;
}

export interface DemoRetailer {
  slug: string;
  name: string;
  country: string;
  currency: "PLN" | "EUR";
  websiteUrl: string;
  /** Synthetic behaviour knobs. */
  priceFactor: number;
  showsRrp: boolean;
  carryRate: number;
  shippingMinor: number;
}

export const DEMO_BRANDS: { name: string; country: string }[] = [
  { name: "Dior", country: "FR" },
  { name: "Chanel", country: "FR" },
  { name: "Yves Saint Laurent", country: "FR" },
  { name: "Tom Ford", country: "US" },
  { name: "Maison Francis Kurkdjian", country: "FR" },
  { name: "Creed", country: "FR" },
  { name: "Giorgio Armani", country: "IT" },
  { name: "Prada", country: "IT" },
  { name: "Versace", country: "IT" },
  { name: "Jean Paul Gaultier", country: "FR" },
  { name: "Byredo", country: "SE" },
  { name: "Le Labo", country: "US" },
  { name: "Xerjoff", country: "IT" },
  { name: "Initio", country: "FR" },
  { name: "Parfums de Marly", country: "FR" },
];

const p = (
  brand: string, name: string, concentration: ConcentrationCode, volumeMl: number,
  category: DemoProduct["category"], basePln: number, releaseYear?: number, featuredRank?: number,
): DemoProduct => ({ brand, name, concentration, volumeMl, category, basePln, releaseYear, featuredRank });

export const DEMO_PRODUCTS: DemoProduct[] = [
  p("Dior", "Sauvage", "EDT", 100, "Men", 449, 2015, 3),
  p("Dior", "Sauvage", "EDP", 60, "Men", 399, 2018),
  p("Dior", "Sauvage", "EDP", 100, "Men", 529, 2018, 1),
  p("Dior", "Sauvage", "PARFUM", 100, "Men", 599, 2019),
  p("Dior", "J'adore", "EDP", 100, "Women", 619, 1999),
  p("Dior", "Dior Homme Intense", "EDP", 100, "Men", 569),
  p("Chanel", "Bleu de Chanel", "EDT", 100, "Men", 549, 2010),
  p("Chanel", "Bleu de Chanel", "EDP", 50, "Men", 469, 2014),
  p("Chanel", "Bleu de Chanel", "EDP", 100, "Men", 649, 2014, 2),
  p("Chanel", "Bleu de Chanel", "PARFUM", 100, "Men", 739, 2018),
  p("Chanel", "Coco Mademoiselle", "EDP", 100, "Women", 729, 2001, 6),
  p("Chanel", "N°5", "EDP", 100, "Women", 749),
  p("Yves Saint Laurent", "Y", "EDP", 100, "Men", 469, 2018, 4),
  p("Yves Saint Laurent", "Libre", "EDP", 90, "Women", 549, 2019),
  p("Yves Saint Laurent", "Black Opium", "EDP", 90, "Women", 539, 2014, 8),
  p("Yves Saint Laurent", "La Nuit de L'Homme", "EDT", 100, "Men", 429, 2009),
  p("Yves Saint Laurent", "MYSLF", "EDP", 100, "Men", 499, 2023),
  p("Tom Ford", "Ombré Leather", "EDP", 100, "Unisex", 699, 2018, 7),
  p("Tom Ford", "Noir Extreme", "EDP", 100, "Men", 749, 2015),
  p("Tom Ford", "Black Orchid", "EDP", 100, "Unisex", 729, 2006),
  p("Tom Ford", "Tobacco Vanille", "EDP", 50, "Unisex", 1199, 2007),
  p("Maison Francis Kurkdjian", "Baccarat Rouge 540", "EDP", 70, "Unisex", 1149, 2015, 5),
  p("Maison Francis Kurkdjian", "Grand Soir", "EDP", 70, "Unisex", 899, 2016),
  p("Creed", "Aventus", "EDP", 100, "Men", 1399, 2010, 9),
  p("Creed", "Silver Mountain Water", "EDP", 100, "Unisex", 1299, 1995),
  p("Giorgio Armani", "Acqua di Giò", "EDT", 100, "Men", 399, 1996),
  p("Giorgio Armani", "Acqua di Giò Profondo", "EDP", 100, "Men", 499, 2020),
  p("Giorgio Armani", "Sì", "EDP", 100, "Women", 529, 2013),
  p("Giorgio Armani", "Stronger With You Intensely", "EDP", 100, "Men", 449, 2019, 10),
  p("Prada", "L'Homme", "EDT", 100, "Men", 449, 2016),
  p("Prada", "Luna Rossa Carbon", "EDT", 100, "Men", 429, 2017),
  p("Prada", "Paradoxe", "EDP", 90, "Women", 569, 2022),
  p("Versace", "Eros", "EDT", 100, "Men", 349, 2012, 11),
  p("Versace", "Eros", "EDP", 100, "Men", 399, 2020),
  p("Versace", "Dylan Blue", "EDT", 100, "Men", 329, 2016),
  p("Versace", "Bright Crystal", "EDT", 90, "Women", 319, 2006),
  p("Jean Paul Gaultier", "Le Male", "EDT", 125, "Men", 369, 1995),
  p("Jean Paul Gaultier", "Le Male Le Parfum", "EDP", 125, "Men", 449, 2020, 12),
  p("Jean Paul Gaultier", "Ultra Male", "EDT", 125, "Men", 429, 2015),
  p("Jean Paul Gaultier", "Scandal", "EDP", 80, "Women", 449, 2017),
  p("Byredo", "Gypsy Water", "EDP", 100, "Unisex", 949, 2008),
  p("Byredo", "Bal d'Afrique", "EDP", 100, "Unisex", 949, 2009),
  p("Byredo", "Mojave Ghost", "EDP", 100, "Unisex", 949, 2014),
  p("Le Labo", "Santal 33", "EDP", 100, "Unisex", 1249, 2011),
  p("Le Labo", "Another 13", "EDP", 100, "Unisex", 1249, 2010),
  p("Xerjoff", "Naxos", "EDP", 100, "Unisex", 899, 2015),
  p("Xerjoff", "Erba Pura", "EDP", 100, "Unisex", 849, 2019),
  p("Initio", "Oud for Greatness", "EDP", 90, "Unisex", 1199, 2018),
  p("Initio", "Side Effect", "EDP", 90, "Unisex", 1149, 2016),
  p("Parfums de Marly", "Layton", "EDP", 125, "Men", 999, 2016),
  p("Parfums de Marly", "Delina", "EDP", 75, "Women", 1049, 2017),
  p("Parfums de Marly", "Pegasus", "EDP", 125, "Men", 999, 2011),
];

export const DEMO_RETAILERS: DemoRetailer[] = [
  { slug: "sephora-pl", name: "Sephora", country: "PL", currency: "PLN", websiteUrl: "https://www.sephora.pl", priceFactor: 1.08, showsRrp: false, carryRate: 0.85, shippingMinor: 0 },
  { slug: "douglas-pl", name: "Douglas", country: "PL", currency: "PLN", websiteUrl: "https://www.douglas.pl", priceFactor: 1.05, showsRrp: false, carryRate: 0.85, shippingMinor: 0 },
  { slug: "notino-pl", name: "Notino", country: "PL", currency: "PLN", websiteUrl: "https://www.notino.pl", priceFactor: 0.9, showsRrp: true, carryRate: 0.9, shippingMinor: 1290 },
  { slug: "perfumeria-pl", name: "Perfumeria.pl", country: "PL", currency: "PLN", websiteUrl: "https://www.perfumeria.pl", priceFactor: 0.93, showsRrp: true, carryRate: 0.7, shippingMinor: 1490 },
  { slug: "e-glamour-pl", name: "E-Glamour", country: "PL", currency: "PLN", websiteUrl: "https://www.e-glamour.pl", priceFactor: 0.88, showsRrp: true, carryRate: 0.65, shippingMinor: 1199 },
  { slug: "flaconi-de", name: "Flaconi", country: "DE", currency: "EUR", websiteUrl: "https://www.flaconi.de", priceFactor: 0.97, showsRrp: true, carryRate: 0.7, shippingMinor: 495 },
  { slug: "douglas-de", name: "Douglas", country: "DE", currency: "EUR", websiteUrl: "https://www.douglas.de", priceFactor: 1.04, showsRrp: false, carryRate: 0.7, shippingMinor: 0 },
  { slug: "marionnaud-fr", name: "Marionnaud", country: "FR", currency: "EUR", websiteUrl: "https://www.marionnaud.fr", priceFactor: 1.06, showsRrp: false, carryRate: 0.5, shippingMinor: 590 },
];

export const CONC_SLUG: Record<ConcentrationCode, string> = {
  EDC: "edc", EDT: "edt", EDP: "edp", PARFUM: "parfum", EXTRAIT: "extrait", OTHER: "other",
};
const CONC_TITLE: Record<ConcentrationCode, string> = {
  EDC: "Eau de Cologne", EDT: "Eau de Toilette", EDP: "Eau de Parfum", PARFUM: "Parfum", EXTRAIT: "Extrait de Parfum", OTHER: "",
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/°/g, "o")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function demoProductSlug(product: DemoProduct): string {
  return slugify(`${product.brand} ${product.name} ${CONC_SLUG[product.concentration]} ${product.volumeMl}ml`);
}

/** How a retailer would title the listing; fed through the real matcher. */
export function demoListingTitle(product: DemoProduct): string {
  return `${product.brand} ${product.name} ${CONC_TITLE[product.concentration]} ${product.volumeMl} ml`.replace(/\s+/g, " ");
}
