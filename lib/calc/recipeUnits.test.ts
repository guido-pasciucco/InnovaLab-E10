import { describe, expect, it } from "vitest";

import { convertRecipeQuantityToMinimumUnits } from "./recipeUnits";

describe("convertRecipeQuantityToMinimumUnits", () => {
  it("converts a mass recipe unit to grams", () => {
    expect(convertRecipeQuantityToMinimumUnits("1.5", "kg")).toBe("1500.0000");
    expect(convertRecipeQuantityToMinimumUnits("250", "g")).toBe("250.0000");
  });

  it("converts volume, length and count units", () => {
    expect(convertRecipeQuantityToMinimumUnits("2", "L")).toBe("2000.0000");
    expect(convertRecipeQuantityToMinimumUnits("3.5", "cm")).toBe("35.0000");
    expect(convertRecipeQuantityToMinimumUnits("2", "docena")).toBe("24.0000");
    expect(convertRecipeQuantityToMinimumUnits("3", "par")).toBe("6.0000");
  });

  it("accepts catalog aliases and keeps four decimals", () => {
    expect(convertRecipeQuantityToMinimumUnits("0.0001", "KILOS")).toBe(
      "0.1000",
    );
    expect(convertRecipeQuantityToMinimumUnits("1", "litro")).toBe("1000.0000");
  });

  it.each([
    ["", "kg"],
    ["abc", "kg"],
    ["0", "kg"],
    ["-1", "kg"],
    ["1", ""],
    ["1", "caja"],
  ])("returns null for quantity %j and unit %j", (quantity, unit) => {
    expect(convertRecipeQuantityToMinimumUnits(quantity, unit)).toBeNull();
  });
});
