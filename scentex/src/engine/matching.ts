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

// Order matters: the most specific pattern must win ("extrait de parfum" before "parfum").
const CONCENTRATION_PATTERNS: [RegExp, ConcentrationCode][] = [
  [/\bextrait(\s+de\s+parfum)?\b/, "EXTRAIT"],
  [/\b(eau\s+de\s+parfum|edp|woda\s+perfumowana)\b/, "EDP"],
  [/\b(eau\s+de\s+toilette|edt|woda\s+toaletowa)\b/, "EDT"],
  [/\b(eau\s+de\s+cologne|edc|woda\s+kolonska)\b/, "EDC"],
  [/\b(parfum|perfumy|le\s+parfum)\b/, "PARFUM"],
];

const FILLER = /\b(spray|vaporisateur|natural|for\s+(men|women|him|her)|pour\s+(homme|femme)|men|women|unisex|woda|perfumy|dla\s+(mezczyzn|kobiet))\b/g;

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
  const n = normalizeText(text);
  for (const [pattern, code] of CONCENTRATION_PATTERNS) if (pattern.test(n)) return code;
  return null;
}

export function parseTitle(title: string, brand?: string): ParsedTitle {
  let rest = normalizeText(title);
  const concentration = parseConcentration(rest);
  const volumeMl = parseVolumeMl(rest);
  rest = rest.replace(/\d+(?:[.,]\d+)?\s*m?l\b/g, " ");
  if (concentration) for (const [pattern] of CONCENTRATION_PATTERNS) rest = rest.replace(pattern, " ");
  rest = rest.replace(FILLER, " ").replace(/[.,]/g, " ");
  if (brand) {
    const variants = new Set([normalizeText(brand), normalizeBrand(brand)]);
    for (const [alias, canonical] of Object.entries(BRAND_ALIASES)) if (canonical === normalizeBrand(brand)) variants.add(alias);
    for (const v of [...variants].sort((a, b) => b.length - a.length)) {
      rest = rest.replace(new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), " ");
    }
  }
  return { concentration, volumeMl, nameKey: rest.replace(/\s+/g, " ").trim() };
}

function candidateNameKey(c: MatchCandidate): string {
  return parseTitle(c.name, c.brandName).nameKey;
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
