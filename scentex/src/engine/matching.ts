/**
 * Product matching: decide which canonical Product a retailer listing belongs to.
 * Rule of thumb: never merge on a guess. Concentration and volume are part of the
 * identity, so "Sauvage EDT 100 ml" and "Sauvage EDP 100 ml" can never share a history.
 */
export type ConcentrationCode = "EDC" | "EDT" | "EDP" | "PARFUM" | "EXTRAIT" | "OTHER";

export interface ParsedTitle {
  concentration: ConcentrationCode | null;
  volumeMl: number | null;
  /** Normalised line name with brand, concentration, volume and filler words removed. */
  nameKey: string;
}

export interface MatchCandidate {
  id: string;
  ean: string | null;
  brandName: string;
  name: string;
  concentration: ConcentrationCode;
  volumeMl: number;
}

export interface MatchInput {
  title: string;
  brand?: string;
  ean?: string;
  volumeMl?: number;
  concentration?: ConcentrationCode;
}

export type MatchResult =
  | { productId: string; status: "AUTO_EAN" | "AUTO_ATTRIBUTES"; confidence: number }
  | { productId: null; status: "PENDING_REVIEW"; confidence: number; suggestionId: string | null };

/**
 * Concentration wording. EXPLICIT phrases state the concentration unambiguously. BARE words
 * ("Parfum", "Le Parfum", "Perfumy") are only trusted when no explicit phrase is present,
 * because they are often part of a fragrance's *name*: "Fahrenheit Le Parfum woda perfumowana"
 * is an EDP called "Fahrenheit Le Parfum", not "Fahrenheit".
 */
const EXPLICIT_CONCENTRATION: [RegExp, ConcentrationCode][] = [
  [/\b(extrait\s+de\s+parfum|ekstrakt\s+perfum)\b/g, "EXTRAIT"],
  [/\b(eau\s+de\s+parfum|edp|woda\s+perfumowana)\b/g, "EDP"],
  [/\b(eau\s+de\s+toilette|edt|woda\s+toaletowa)\b/g, "EDT"],
  [/\b(eau\s+de\s+cologne|edc|woda\s+kolonska)\b/g, "EDC"],
];
const BARE_CONCENTRATION: [RegExp, ConcentrationCode][] = [
  [/\bextrait\b/g, "EXTRAIT"],
  [/\b(le\s+parfum|parfum|perfumy)\b/g, "PARFUM"],
];

/** Retail descriptors that never distinguish one fragrance from another. Gender phrases that can be
 *  part of a name ("Pour Homme", "Pour Femme", "For Men") are deliberately NOT in this list:
 *  "Noir" and "Noir Pour Femme" are different fragrances. */
const FILLER = /\b(spray|vaporisateur|natural|unisex|dla\s+(mezczyzn|kobiet)|damsk[ai]|mesk[ai])\b/g;
/** Trailing single-letter gender marker some shops append ("… 100 ml W"). */
const GENDER_SUFFIX = /\s+[wm]$/;

function findConcentration(normalized: string): { code: ConcentrationCode; pattern: RegExp } | null {
  for (const group of [EXPLICIT_CONCENTRATION, BARE_CONCENTRATION]) {
    for (const [pattern, code] of group) {
      pattern.lastIndex = 0;
      if (pattern.test(normalized)) return { code, pattern };
    }
  }
  return null;
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BRAND_ALIASES: Record<string, string> = {
  "christian dior": "dior",
  ysl: "yves saint laurent",
  "saint laurent": "yves saint laurent",
  armani: "giorgio armani",
  "emporio armani": "giorgio armani",
  mfk: "maison francis kurkdjian",
  jpg: "jean paul gaultier",
  "marly": "parfums de marly",
};

export function normalizeBrand(value: string): string {
  const n = normalizeText(value).replace(/[.,]/g, "");
  return BRAND_ALIASES[n] ?? n;
}

export function parseVolumeMl(text: string): number | null {
  const n = normalizeText(text);
  const ml = n.match(/(\d+(?:[.,]\d+)?)\s*ml\b/);
  if (ml) return Math.round(Number(ml[1]!.replace(",", ".")));
  const l = n.match(/(\d+(?:[.,]\d+)?)\s*l\b/);
  if (l) return Math.round(Number(l[1]!.replace(",", ".")) * 1000);
  return null;
}

export function parseConcentration(text: string): ConcentrationCode | null {
  return findConcentration(normalizeText(text))?.code ?? null;
}

function stripBrand(rest: string, brand: string | undefined): string {
  if (!brand) return rest;
  const variants = new Set([normalizeText(brand), normalizeBrand(brand)]);
  for (const [alias, canonical] of Object.entries(BRAND_ALIASES)) if (canonical === normalizeBrand(brand)) variants.add(alias);
  for (const v of [...variants].sort((a, b) => b.length - a.length)) {
    rest = rest.replace(new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), " ");
  }
  return rest;
}

const tidy = (rest: string) => rest.replace(/[.,]/g, " ").replace(/\s+/g, " ").trim().replace(GENDER_SUFFIX, "").trim();

export function parseTitle(title: string, brand?: string): ParsedTitle {
  let rest = normalizeText(title);
  const found = findConcentration(rest);
  const volumeMl = parseVolumeMl(rest);
  rest = rest.replace(/\d+(?:[.,]\d+)?\s*m?l\b/g, " ");
  // Remove only the phrase that stated the concentration; other such words belong to the name.
  if (found) rest = rest.replace(found.pattern, " ");
  rest = stripBrand(rest.replace(FILLER, " "), brand);
  return { concentration: found?.code ?? null, volumeMl, nameKey: tidy(rest) };
}

/** Key of a canonical product name: brand and filler removed, every other word kept. */
export function lineKey(name: string, brand?: string): string {
  return tidy(stripBrand(normalizeText(name).replace(FILLER, " "), brand));
}

function candidateNameKey(c: MatchCandidate): string {
  return lineKey(c.name, c.brandName);
}

/**
 * 1. EAN/GTIN match -> certain.
 * 2. Brand + line name + concentration + volume all agree -> automatic.
 * 3. Anything weaker -> PENDING_REVIEW for a human (admin panel), never auto-linked.
 */
export function matchProduct(input: MatchInput, candidates: MatchCandidate[]): MatchResult {
  if (input.ean) {
    const byEan = candidates.find((c) => c.ean === input.ean);
    if (byEan) return { productId: byEan.id, status: "AUTO_EAN", confidence: 1 };
  }

  const parsed = parseTitle(input.title, input.brand);
  const concentration = input.concentration ?? parsed.concentration;
  const volumeMl = input.volumeMl ?? parsed.volumeMl;
  const brandKey = input.brand ? normalizeBrand(input.brand) : null;

  const sameLine = candidates.filter((c) => {
    const brandOk = brandKey ? normalizeBrand(c.brandName) === brandKey : normalizeText(input.title).includes(normalizeBrand(c.brandName));
    return brandOk && candidateNameKey(c) === (brandKey ? parsed.nameKey : parseTitle(input.title, c.brandName).nameKey);
  });

  if (concentration && volumeMl) {
    const exact = sameLine.filter((c) => c.concentration === concentration && c.volumeMl === volumeMl);
    if (exact.length === 1) return { productId: exact[0]!.id, status: "AUTO_ATTRIBUTES", confidence: 0.9 };
  }

  // Same brand and line, but concentration/volume is missing or ambiguous: suggest, don't link.
  const suggestion = sameLine.find((c) => (!concentration || c.concentration === concentration) && (!volumeMl || c.volumeMl === volumeMl));
  return { productId: null, status: "PENDING_REVIEW", confidence: suggestion ? 0.5 : 0, suggestionId: suggestion?.id ?? null };
}

/**
 * Human-readable line name from a listing title: the title with the leading brand, the stated
 * concentration, the volume and retail filler removed, original capitalisation kept.
 * Follows the same rules as parseTitle, so the derived name always maps back to the same key.
 */
export function deriveLineName(title: string, brand: string): string {
  let rest = title.normalize("NFC");
  const strip = (pattern: RegExp) => { rest = rest.replace(pattern, " "); };
  for (const variant of [brand, ...Object.entries(BRAND_ALIASES).filter(([, canonical]) => canonical === normalizeBrand(brand)).map(([alias]) => alias)]) {
    // Leading brand only: "Bleu de Chanel" must keep its own name.
    strip(new RegExp(`^\\s*${variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`, "i"));
  }
  strip(/\d+(?:[.,]\d+)?\s*m?l\b/gi);
  const explicit = /\b(extrait\s+de\s+parfum|ekstrakt\s+perfum|eau\s+de\s+parfum|eau\s+de\s+toilette|eau\s+de\s+cologne|woda\s+perfumowana|woda\s+toaletowa|woda\s+kolo[nń]ska|edp|edt|edc)\b/gi;
  if (explicit.test(rest)) strip(explicit);
  else strip(/\b(extrait|le\s+parfum|parfum|perfumy)\b/gi);
  strip(/\b(spray|vaporisateur|natural|unisex)\b/gi);
  strip(/\b(dla\s+(kobiet|m[eę][zż]czyzn)|damsk[ai]|m[eę]sk[ai])(?=\s|$)/gi);
  return rest.replace(/\s+/g, " ").trim().replace(/\s+[WM]$/, "").replace(/[\s,;:–-]+$/g, "").replace(/^[\s,;:–-]+/g, "").trim();
}
