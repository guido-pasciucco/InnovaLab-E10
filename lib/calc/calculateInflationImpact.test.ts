import { describe, expect, it } from "vitest";

import { calculateInflationImpact, type InflationImpactInput } from "./calculateInflationImpact";

// Mockup example: fixed 320.000, variable 2.500 per unit, 200 units and a 30 %
// margin, priced at 5.857,14 with a profit of 351.428,57.
const validInput: InflationImpactInput = {
  totalFixed: "320000.00",
  variableUnit: "2500.00",
  unitCost: "4100.00",
  volume: 200,
  marginPct: "30",
  increasePct: "10",
};

describe("calculateInflationImpact", () => {
  it("returns the margin and profit at the current price and the price that keeps the margin", () => {
    // +10 % of 2500 = 250 more per unit: unit cost 4350.
    // (5857.14 - 4350) / 5857.14 = 25.73 %; 351428.57 - 250 × 200 = 301428.57;
    // 4350 / 0.7 = 6214.29, 6.1 % above 5857.14.
    const result = calculateInflationImpact(validInput);

    expect(result).toEqual({
      ok: true,
      currentPrice: "5857.14",
      currentMarginPct: "30.00",
      currentProfit: "351428.57",
      newVariableUnit: "2750.00",
      newUnitCost: "4350.00",
      newMarginPct: "25.73",
      newProfit: "301428.57",
      keepMarginPrice: "6214.29",
      keepMarginPriceChangePct: "6.1",
    });
  });

  it("changes nothing when the increase is 0 %", () => {
    const result = calculateInflationImpact({ ...validInput, increasePct: "0" });

    expect(result).toMatchObject({
      ok: true,
      newUnitCost: "4100.00",
      newMarginPct: "30.00",
      newProfit: "351428.57",
      keepMarginPrice: "5857.14",
      keepMarginPriceChangePct: "0.0",
    });
  });

  it("returns a negative margin when the increase leaves the price below the new unit cost", () => {
    // +100 %: variable 5000, unit cost 6600; (5857.14 - 6600) / 5857.14 = -12.68 %.
    const result = calculateInflationImpact({ ...validInput, increasePct: "100" });

    expect(result).toMatchObject({
      ok: true,
      newUnitCost: "6600.00",
      newMarginPct: "-12.68",
      newProfit: "-148571.43",
      keepMarginPrice: "9428.57",
    });
  });

  it.each(["-5", "x", "", "Infinity"])("returns INVALID_INCREASE when the increase is %j", (increasePct) => {
    const result = calculateInflationImpact({ ...validInput, increasePct });

    expect(result).toEqual({ ok: false, code: "INVALID_INCREASE" });
  });

  it.each([
    { name: "the margin is 100 %", input: { marginPct: "100" }, code: "INVALID_MARGIN" },
    { name: "the volume is zero", input: { volume: 0 }, code: "INVALID_VOLUME" },
    { name: "an amount is not a number", input: { variableUnit: "abc" }, code: "INVALID_AMOUNT" },
  ] as const)("returns $code when $name", ({ input, code }) => {
    const result = calculateInflationImpact({ ...validInput, ...input });

    expect(result).toEqual({ ok: false, code });
  });
});
