import { describe, expect, it } from "vitest";

import { unitPriceFormat } from "./format";

const PESO = "$\u00A0";

describe("unitPriceFormat", () => {
  it("writes the minimum unit cost with exactly two decimals", () => {
    expect(unitPriceFormat.format(83.3333)).toBe(`${PESO}83,33`);
    expect(unitPriceFormat.format(2500)).toBe(`${PESO}2.500,00`);
  });

  it("writes whole amounts with two decimals", () => {
    expect(unitPriceFormat.format(18750)).toBe(`${PESO}18.750,00`);
    expect(unitPriceFormat.format(0)).toBe(`${PESO}0,00`);
  });

  it("writes sub-centavo amounts rounded to the cent", () => {
    // 0.006 → two decimals: $ 0,01.
    expect(unitPriceFormat.format(0.006)).toBe(`${PESO}0,01`);
  });
});
