import { describe, expect, it } from "vitest";

import { calculateMinimumUnitPrice, calculateMinimumUnits } from "./supplyCost";

describe("calculateMinimumUnits", () => {
  it("multiplies the purchase quantity by the equivalence", () => {
    expect(calculateMinimumUnits("25", "1000")).toBe("25000.0000");
  });

  it("works with non-metric equivalences", () => {
    expect(calculateMinimumUnits("2", "12")).toBe("24.0000");
  });

  it.each(["", "abc", "0", "-1", "1,5"])(
    "returns null for the invalid quantity %j",
    (quantity) => {
      expect(calculateMinimumUnits(quantity, "1000")).toBeNull();
    },
  );

  it.each(["", "abc", "0", "-1"])(
    "returns null for the invalid equivalence %j",
    (factor) => {
      expect(calculateMinimumUnits("25", factor)).toBeNull();
    },
  );
});

describe("calculateMinimumUnitPrice", () => {
  it("divides the purchase price by the total minimum units", () => {
    expect(calculateMinimumUnitPrice("18750.00", "25", "1000")).toBe("0.7500");
  });

  it("keeps four decimals for repeating results", () => {
    // 1000 / 12 = 83.333...
    expect(calculateMinimumUnitPrice("1000", "1", "12")).toBe("83.3333");
  });

  it("keeps sub-unit prices", () => {
    // 100 / 25000 = 0.004
    expect(calculateMinimumUnitPrice("100.00", "25", "1000")).toBe("0.0040");
  });

  it("accepts a zero price", () => {
    expect(calculateMinimumUnitPrice("0", "25", "1000")).toBe("0.0000");
  });

  it.each(["", "abc", "-1"])("returns null for the invalid price %j", (price) => {
    expect(calculateMinimumUnitPrice(price, "25", "1000")).toBeNull();
  });

  it("returns null when the total minimum units are zero", () => {
    expect(calculateMinimumUnitPrice("18750.00", "0", "1000")).toBeNull();
  });
});
