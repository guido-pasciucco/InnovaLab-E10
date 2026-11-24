import { describe, expect, it } from "vitest";

import { calculateMinimumUnitPrice, calculateMinimumUnits } from "./supplyCost";

// The conversion factor comes from the unit catalog: kg → 1000, docena → 12.
describe("calculateMinimumUnits", () => {
  it("multiplies the purchase quantity by the catalog factor", () => {
    expect(calculateMinimumUnits("25", "kg")).toBe("25000.0000");
  });

  it("works with non-metric units", () => {
    expect(calculateMinimumUnits("2", "docena")).toBe("24.0000");
  });

  it.each(["", "abc", "0", "-1", "1,5"])(
    "returns null for the invalid quantity %j",
    (quantity) => {
      expect(calculateMinimumUnits(quantity, "kg")).toBeNull();
    },
  );

  it.each(["", "caja"])("returns null for the unit %j outside the catalog", (unit) => {
    expect(calculateMinimumUnits("25", unit)).toBeNull();
  });
});

describe("calculateMinimumUnitPrice", () => {
  it("divides the purchase price by the total minimum units", () => {
    expect(calculateMinimumUnitPrice("18750.00", "25", "kg")).toBe("0.7500");
  });

  it("keeps four decimals for repeating results", () => {
    // 1000 / 12 = 83.333...
    expect(calculateMinimumUnitPrice("1000", "1", "docena")).toBe("83.3333");
  });

  it("keeps sub-unit prices", () => {
    // 100 / 25000 = 0.004
    expect(calculateMinimumUnitPrice("100.00", "25", "kg")).toBe("0.0040");
  });

  it("accepts a zero price", () => {
    expect(calculateMinimumUnitPrice("0", "25", "kg")).toBe("0.0000");
  });

  it.each(["", "abc", "-1"])("returns null for the invalid price %j", (price) => {
    expect(calculateMinimumUnitPrice(price, "25", "kg")).toBeNull();
  });

  it("returns null when the total minimum units are zero", () => {
    expect(calculateMinimumUnitPrice("18750.00", "0", "kg")).toBeNull();
  });

  it("returns null for a unit outside the catalog", () => {
    expect(calculateMinimumUnitPrice("18750.00", "25", "bolsa")).toBeNull();
  });
});
