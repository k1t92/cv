import { describe, expect, it } from "vitest";
import { matchProduct, normalizeBrand, parseConcentration, parseTitle, parseVolumeMl, type MatchCandidate } from "@/engine/matching";

const sauvage = (id: string, concentration: MatchCandidate["concentration"], volumeMl: number, ean: string | null = null): MatchCandidate =>
  ({ id, ean, brandName: "Dior", name: "Sauvage", concentration, volumeMl });

const candidates: MatchCandidate[] = [
  sauvage("edt100", "EDT", 100),
  sauvage("edp60", "EDP", 60),
  sauvage("edp100", "EDP", 100, "3348901368247"),
  sauvage("parfum100", "PARFUM", 100),
  { id: "bleu", ean: null, brandName: "Chanel", name: "Bleu de Chanel", concentration: "EDP", volumeMl: 100 },
];

describe("title parsing", () => {
  it("reads volume in ml and litres", () => {
    expect(parseVolumeMl("Sauvage EDP 100 ml")).toBe(100);
    expect(parseVolumeMl("Sauvage 60ML spray")).toBe(60);
    expect(parseVolumeMl("Refill 0,3 L")).toBe(300);
    expect(parseVolumeMl("Sauvage Eau de Parfum")).toBeNull();
  });

  it("distinguishes concentrations, most specific first", () => {
    expect(parseConcentration("Sauvage Eau de Toilette")).toBe("EDT");
    expect(parseConcentration("Sauvage Eau de Parfum")).toBe("EDP");
    expect(parseConcentration("Sauvage Parfum")).toBe("PARFUM");
    expect(parseConcentration("Naxos Extrait de Parfum")).toBe("EXTRAIT");
    expect(parseConcentration("Sauvage woda toaletowa")).toBe("EDT");
    expect(parseConcentration("Sauvage")).toBeNull();
  });

  it("normalises brand aliases and strips noise from the line name", () => {
    expect(normalizeBrand("Christian Dior")).toBe("dior");
    expect(normalizeBrand("YSL")).toBe("yves saint laurent");
    expect(parseTitle("DIOR Sauvage Eau de Parfum Spray 100 ml for Men", "Dior").nameKey).toBe("sauvage");
  });
});

describe("product matching", () => {
  it("never merges different concentrations of the same line", () => {
    const edt = matchProduct({ title: "Dior Sauvage Eau de Toilette 100 ml", brand: "Dior" }, candidates);
    const edp = matchProduct({ title: "Dior Sauvage Eau de Parfum 100 ml", brand: "Dior" }, candidates);
    const parfum = matchProduct({ title: "Dior Sauvage Parfum 100 ml", brand: "Dior" }, candidates);
    expect([edt.productId, edp.productId, parfum.productId]).toEqual(["edt100", "edp100", "parfum100"]);
  });

  it("never merges different volumes", () => {
    expect(matchProduct({ title: "Dior Sauvage EDP 60ml", brand: "Christian Dior" }, candidates).productId).toBe("edp60");
  });

  it("prefers EAN over text", () => {
    const result = matchProduct({ title: "Totally different title", ean: "3348901368247" }, candidates);
    expect(result).toMatchObject({ productId: "edp100", status: "AUTO_EAN", confidence: 1 });
  });

  it("sends listings with missing concentration or volume to manual review", () => {
    const noConc = matchProduct({ title: "Dior Sauvage 100 ml", brand: "Dior" }, candidates);
    expect(noConc).toMatchObject({ productId: null, status: "PENDING_REVIEW" });
    const noVolume = matchProduct({ title: "Dior Sauvage Eau de Parfum", brand: "Dior" }, candidates);
    expect(noVolume.productId).toBeNull();
  });

  it("does not link an unknown size or an unknown product", () => {
    expect(matchProduct({ title: "Dior Sauvage Eau de Parfum 200 ml", brand: "Dior" }, candidates).productId).toBeNull();
    expect(matchProduct({ title: "Dior Sauvage Elixir 60 ml", brand: "Dior" }, candidates).productId).toBeNull();
  });

  it("matches without a separate brand field when the brand is in the title", () => {
    expect(matchProduct({ title: "Chanel Bleu de Chanel Eau de Parfum 100 ml" }, candidates).productId).toBe("bleu");
  });
});
