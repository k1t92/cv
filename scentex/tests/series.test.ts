import { describe, expect, it } from "vitest";
import { clip, compress, lowestAcross, seriesStats } from "@/lib/series";
import { convertMinor, discountPct, pctChange } from "@/lib/money";
import { formatMoney, formatPct, direction } from "@/lib/format";

describe("step series", () => {
  it("compresses runs of equal values", () => {
    expect(compress([{ t: 1, v: 5 }, { t: 2, v: 5 }, { t: 3, v: 6 }, { t: 4, v: null }, { t: 5, v: null }])).toEqual([
      { t: 1, v: 5 }, { t: 3, v: 6 }, { t: 4, v: null },
    ]);
  });

  it("carries the price in force into the window start", () => {
    expect(clip([{ t: 1, v: 5 }, { t: 10, v: 7 }], 5, 20)).toEqual([{ t: 5, v: 5 }, { t: 10, v: 7 }]);
    expect(clip([{ t: 5, v: 5 }], 5, 20)).toEqual([{ t: 5, v: 5 }]);
    expect(clip([{ t: 30, v: 5 }], 5, 20)).toEqual([]);
  });

  it("takes the lowest purchasable price across retailers, ignoring out-of-stock", () => {
    const a = [{ t: 0, v: 100 }, { t: 10, v: 80 }, { t: 20, v: null }];
    const b = [{ t: 5, v: 90 }, { t: 30, v: 95 }];
    expect(lowestAcross([a, b])).toEqual([{ t: 0, v: 100 }, { t: 5, v: 90 }, { t: 10, v: 80 }, { t: 20, v: 90 }, { t: 30, v: 95 }]);
  });

  it("reports a gap when nothing is in stock", () => {
    expect(lowestAcross([[{ t: 0, v: 100 }, { t: 10, v: null }]])).toEqual([{ t: 0, v: 100 }, { t: 10, v: null }]);
  });

  it("computes time-weighted stats", () => {
    const stats = seriesStats([{ t: 0, v: 100 }, { t: 10, v: 200 }], 40);
    expect(stats).toMatchObject({ min: 100, max: 200, first: 100, last: 200, avg: 175, changePct: 100 });
    expect(seriesStats([], 10)).toMatchObject({ min: null, avg: null, changePct: null });
  });
});

describe("money", () => {
  it("converts between PLN and EUR minor units", () => {
    expect(convertMinor(10000, "EUR", "PLN", 4.25)).toBe(42500);
    expect(convertMinor(42500, "PLN", "EUR", 4.25)).toBe(10000);
    expect(convertMinor(999, "PLN", "PLN", 4.25)).toBe(999);
  });

  it("computes change and claimed discount", () => {
    expect(pctChange(200, 150)).toBe(-25);
    expect(pctChange(null, 150)).toBeNull();
    expect(discountPct(7500, 10000)).toBe(25);
    expect(discountPct(10000, 10000)).toBeNull();
  });

  it("formats values and direction", () => {
    expect(formatMoney(38999, "PLN")).toBe("389.99 PLN");
    expect(formatMoney(null, "EUR")).toBe("—");
    expect(formatPct(-12.44)).toBe("−12.4%");
    expect(formatPct(0.01)).toBe("0.0%");
    expect(direction(0.01)).toBe("flat");
    expect(direction(-3)).toBe("down");
  });
});
