import { describe, expect, it } from "vitest";

import { calculateBreakEven, type BreakEvenInput } from "./calculateBreakEven";

// Mockup example for step 7: fixed 320.000, variable 2.500 per unit, 200 units
// and the step 6 price for a 30 % margin (4.100 / 0,70 = 5.857,14).
const validInput: BreakEvenInput = {
  price: "5857.14",
  variableUnit: "2500.00",
  totalFixed: "320000.00",
  volume: 200,
};

describe("calculateBreakEven", () => {
  it("returns the mockup break-even when the price has cents", () => {
    const result = calculateBreakEven(validInput);

    // 320000 / 3357.14 = 95.31923...
    expect(result).toEqual({
      ok: true,
      contributionUnit: "3357.14",
      breakEvenUnits: "96",
      breakEvenUnitsExact: "95.3192",
      breakEvenSales: "558298.08",
      revenueAtVolume: "1171428.00",
      totalCostAtVolume: "820000.00",
    });
  });

  it("computes the sales from the unrounded units when the units have decimals", () => {
    // Rounding the units first would give 95.3192 × 5857.14 = 558297.90.
    const result = calculateBreakEven(validInput);

    expect(result.ok && result.breakEvenSales).toBe("558298.08");
  });

  it("returns whole units without rounding up when the division is exact", () => {
    const result = calculateBreakEven({ ...validInput, price: "5000" });

    expect(result).toEqual({
      ok: true,
      contributionUnit: "2500.00",
      breakEvenUnits: "128",
      breakEvenUnitsExact: "128.0000",
      breakEvenSales: "640000.00",
      revenueAtVolume: "1000000.00",
      totalCostAtVolume: "820000.00",
    });
  });

  it("returns more units than the volume when the volume does not reach the break-even", () => {
    const result = calculateBreakEven({ ...validInput, price: "2600" });

    expect(result).toMatchObject({ ok: true, breakEvenUnits: "3200", breakEvenSales: "8320000.00" });
  });

  it("rounds a tiny fraction up to the next whole unit", () => {
    // 1000 / 3 = 333.33...: selling 333 units still leaves a loss.
    const result = calculateBreakEven({ ...validInput, price: "3", variableUnit: "0", totalFixed: "1000" });

    expect(result).toMatchObject({ ok: true, breakEvenUnits: "334", breakEvenUnitsExact: "333.3333" });
  });

  it("returns zero units and sales when there are no fixed costs", () => {
    const result = calculateBreakEven({ ...validInput, totalFixed: "0" });

    expect(result).toMatchObject({
      ok: true,
      breakEvenUnits: "0",
      breakEvenUnitsExact: "0.0000",
      breakEvenSales: "0.00",
    });
  });

  it.each([
    { name: "the price equals the variable cost", price: "2500.00" },
    { name: "the price is below the variable cost", price: "2000.00" },
  ])("returns NO_CONTRIBUTION when $name", ({ price }) => {
    const result = calculateBreakEven({ ...validInput, price });

    expect(result).toEqual({ ok: false, code: "NO_CONTRIBUTION" });
  });

  it.each([0, -5, 1.5, Number.NaN])("returns INVALID_VOLUME when the volume is %j", (volume) => {
    const result = calculateBreakEven({ ...validInput, volume });

    expect(result).toEqual({ ok: false, code: "INVALID_VOLUME" });
  });

  it.each([
    { field: "price", value: "x" },
    { field: "variableUnit", value: "" },
    { field: "totalFixed", value: "1,5" },
    { field: "totalFixed", value: "Infinity" },
    { field: "totalFixed", value: "-1" },
    { field: "variableUnit", value: "-0.01" },
    { field: "price", value: "-10" },
  ] as const)("returns INVALID_AMOUNT when $field is $value", ({ field, value }) => {
    const result = calculateBreakEven({ ...validInput, [field]: value });

    expect(result).toEqual({ ok: false, code: "INVALID_AMOUNT" });
  });
});
