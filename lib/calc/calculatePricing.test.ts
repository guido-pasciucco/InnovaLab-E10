import { describe, expect, it } from "vitest";

import { calculatePricing, markupFromMargin, type PricingInput } from "./calculatePricing";

// Mockup example for step 5: fixed 320.000, variable 2.500 per unit, 200 units
// (unit cost 4.100) and a 30 % margin on the selling price.
const validInput: PricingInput = {
  unitCost: "4100.00",
  variableUnit: "2500.00",
  totalFixed: "320000.00",
  volume: 200,
  marginPct: "30",
};

describe("calculatePricing", () => {
  it("returns the mockup price, contribution and profit when the margin is 30 %", () => {
    const result = calculatePricing(validInput);

    expect(result).toEqual({
      ok: true,
      suggestedPrice: "5857.14",
      contributionUnit: "3357.14",
      estimatedProfit: "351428.57",
      hasPositiveContribution: true,
    });
  });

  it("computes the profit from the unrounded price when the price has cents", () => {
    // Rounding the price first would give 3357.14 × 200 − 320000 = 351428.00.
    const result = calculatePricing(validInput);

    expect(result.ok && result.estimatedProfit).toBe("351428.57");
  });

  it("returns the unit cost as the price when the margin is 0", () => {
    const result = calculatePricing({ ...validInput, marginPct: "0" });

    expect(result).toMatchObject({
      ok: true,
      suggestedPrice: "4100.00",
      contributionUnit: "1600.00",
      estimatedProfit: "0.00",
    });
  });

  it("accepts a decimal margin when it has a fraction", () => {
    const result = calculatePricing({ ...validInput, marginPct: "12.5" });

    // 4100 / 0.875 = 4685.714285...
    expect(result).toMatchObject({ ok: true, suggestedPrice: "4685.71" });
  });

  it("flags a non-positive contribution when the price does not cover the variable cost", () => {
    const input = { ...validInput, unitCost: "100.00", variableUnit: "2500.00" };

    const result = calculatePricing({ ...input, marginPct: "10" });

    expect(result).toMatchObject({ ok: true, hasPositiveContribution: false });
  });

  it("flags a zero contribution as non-positive when price equals the variable cost", () => {
    const input = { ...validInput, unitCost: "2500.00", totalFixed: "0.00" };

    const result = calculatePricing({ ...input, marginPct: "0" });

    expect(result).toMatchObject({
      ok: true,
      contributionUnit: "0.00",
      hasPositiveContribution: false,
    });
  });

  it.each(["100", "100.0", "150", "-1", "-0.01", "abc", "", "Infinity", "NaN"])(
    "returns INVALID_MARGIN when the margin is %j",
    (marginPct) => {
      const result = calculatePricing({ ...validInput, marginPct });

      expect(result).toEqual({ ok: false, code: "INVALID_MARGIN" });
    },
  );

  it.each([0, -5, 1.5, Number.NaN])("returns INVALID_VOLUME when the volume is %j", (volume) => {
    const result = calculatePricing({ ...validInput, volume });

    expect(result).toEqual({ ok: false, code: "INVALID_VOLUME" });
  });

  it.each([
    { field: "unitCost", value: "x" },
    { field: "variableUnit", value: "" },
    { field: "totalFixed", value: "1,5" },
  ] as const)("returns INVALID_AMOUNT when $field is $value", ({ field, value }) => {
    const result = calculatePricing({ ...validInput, [field]: value });

    expect(result).toEqual({ ok: false, code: "INVALID_AMOUNT" });
  });
});

describe("markupFromMargin", () => {
  it("returns the markup on cost that gives the same price when the margin is 30 %", () => {
    // 30 / (100 - 30) = 42.857… % → 1.000 × 1.42857 = 1.428,57, same as 1.000 / 0.70.
    expect(markupFromMargin("30")).toBe("42.9");
  });

  it("returns 0 when the margin is 0", () => {
    expect(markupFromMargin("0")).toBe("0.0");
  });

  it("returns 25 when the margin is 20", () => {
    // Docs example: cost 8.000, price 10.000 → 20 % margin, 25 % markup.
    expect(markupFromMargin("20")).toBe("25.0");
  });

  it("returns null when the margin is 100 or more", () => {
    expect(markupFromMargin("100")).toBeNull();
  });

  it("returns null when the margin is negative or not a number", () => {
    expect(markupFromMargin("-1")).toBeNull();
    expect(markupFromMargin("abc")).toBeNull();
  });
});
