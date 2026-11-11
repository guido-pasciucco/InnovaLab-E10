import { describe, expect, it } from "vitest";

import { suggestConversionFactor } from "./suggestConversionFactor";

describe("suggestConversionFactor", () => {
  it.each([
    ["kg", "g", "1000"],
    ["kilos", "gramos", "1000"],
    [" Kilogramos ", " Gramo ", "1000"],
    ["L", "ml", "1000"],
    ["litro", "mililitro", "1000"],
    ["docena", "unidad", "12"],
    ["docenas", "unidades", "12"],
  ])("suggests %s → %s = %s", (purchaseUnit, minimumUnit, expected) => {
    expect(suggestConversionFactor(purchaseUnit, minimumUnit)).toBe(expected);
  });

  it("returns 1 when both inputs are the same free-text unit", () => {
    expect(suggestConversionFactor("caja", "caja")).toBe("1");
  });

  it("returns null when the units belong to different families", () => {
    expect(suggestConversionFactor("kg", "ml")).toBeNull();
  });

  it("returns null for a non-metric pair it cannot infer", () => {
    expect(suggestConversionFactor("caja", "unidad")).toBeNull();
  });

  it("returns null when a unit is missing", () => {
    expect(suggestConversionFactor("", "g")).toBeNull();
    expect(suggestConversionFactor("kg", "")).toBeNull();
  });

  it("ignores accents and case", () => {
    expect(suggestConversionFactor("KILOGRAMOS", "Gramos")).toBe("1000");
  });
});
