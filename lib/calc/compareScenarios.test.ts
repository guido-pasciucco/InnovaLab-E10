import { describe, expect, it } from "vitest";

import {
  compareScenarios,
  realMarginPct,
  type ScenarioBase,
  type ScenarioOverride,
} from "./compareScenarios";

// Mockup example shared with steps 5 and 6: fixed 320.000, variable 2.500 per
// unit and 200 units give a unit cost of 4.100; a 30 % margin prices it at
// 5.857,14, a profit of 351.428,57 and a break-even of 96 units.
const base: ScenarioBase = {
  totalFixed: "320000.00",
  variableUnit: "2500.00",
  unitCost: "4100.00",
  volume: 200,
  marginPct: "30",
};

const noOverrides: ScenarioOverride = { id: "base", priceOverride: null, volumeOverride: null };

describe("compareScenarios", () => {
  it("returns the step 5 and step 6 figures for the base", () => {
    const result = compareScenarios(base, [noOverrides]);

    expect(result).toEqual({
      ok: true,
      base: {
        volume: 200,
        unitCost: "4100.00",
        price: "5857.14",
        realMarginPct: "30.00",
        estimatedProfit: "351428.57",
        breakEvenUnits: "96",
      },
      scenarios: [
        {
          id: "base",
          volume: 200,
          unitCost: "4100.00",
          price: "5857.14",
          realMarginPct: "30.00",
          estimatedProfit: "351428.57",
          breakEvenUnits: "96",
          delta: { marginPoints: "0.00", profit: "0.00", breakEvenUnits: "0" },
        },
      ],
    });
  });

  it("returns the mockup deltas when the price is set by hand", () => {
    // (5000 - 4100) / 5000 = 18 %; (5000 - 2500) × 200 - 320000 = 180000;
    // 320000 / 2500 = 128 units.
    const result = compareScenarios(base, [{ id: "a", priceOverride: "5000", volumeOverride: null }]);

    expect(result.ok && result.scenarios[0]).toEqual({
      id: "a",
      volume: 200,
      unitCost: "4100.00",
      price: "5000.00",
      realMarginPct: "18.00",
      estimatedProfit: "180000.00",
      breakEvenUnits: "128",
      delta: { marginPoints: "-12.00", profit: "-171428.57", breakEvenUnits: "32" },
    });
  });

  it("recomputes the unit cost and prices it with the base margin when only the volume changes", () => {
    // 320000 / 250 + 2500 = 3780; 3780 / 0.7 = 5400;
    // (5400 - 2500) × 250 - 320000 = 405000; 320000 / 2900 = 110.3 → 111.
    const result = compareScenarios(base, [{ id: "b", priceOverride: null, volumeOverride: 250 }]);

    expect(result.ok && result.scenarios[0]).toEqual({
      id: "b",
      volume: 250,
      unitCost: "3780.00",
      price: "5400.00",
      realMarginPct: "30.00",
      estimatedProfit: "405000.00",
      breakEvenUnits: "111",
      delta: { marginPoints: "0.00", profit: "53571.43", breakEvenUnits: "15" },
    });
  });

  it("uses the manual price at the overridden volume when both change", () => {
    // 320000 / 100 + 2500 = 5700; (6000 - 5700) / 6000 = 5 %;
    // (6000 - 2500) × 100 - 320000 = 30000; 320000 / 3500 = 91.4 → 92.
    const result = compareScenarios(base, [{ id: "c", priceOverride: "6000", volumeOverride: 100 }]);

    expect(result.ok && result.scenarios[0]).toMatchObject({
      volume: 100,
      unitCost: "5700.00",
      price: "6000.00",
      realMarginPct: "5.00",
      estimatedProfit: "30000.00",
      breakEvenUnits: "92",
      delta: { marginPoints: "-25.00", profit: "-321428.57", breakEvenUnits: "-4" },
    });
  });

  it("returns no break-even and no break-even delta when the price does not cover the variable cost", () => {
    // (2400 - 4100) / 2400 = -70.83 %; (2400 - 2500) × 200 - 320000 = -340000.
    const result = compareScenarios(base, [{ id: "d", priceOverride: "2400", volumeOverride: null }]);

    expect(result.ok && result.scenarios[0]).toMatchObject({
      realMarginPct: "-70.83",
      estimatedProfit: "-340000.00",
      breakEvenUnits: null,
      delta: { marginPoints: "-100.83", profit: "-691428.57", breakEvenUnits: null },
    });
  });

  it("keeps the scenarios in the order they were given", () => {
    const result = compareScenarios(base, [
      noOverrides,
      { id: "a", priceOverride: "5000", volumeOverride: null },
      { id: "b", priceOverride: null, volumeOverride: 250 },
    ]);

    expect(result.ok && result.scenarios.map((scenario) => scenario.id)).toEqual(["base", "a", "b"]);
  });

  it.each([
    { name: "the margin is 100 %", input: { ...base, marginPct: "100" }, code: "INVALID_MARGIN" },
    { name: "the margin is not a number", input: { ...base, marginPct: "x" }, code: "INVALID_MARGIN" },
    { name: "the base volume is zero", input: { ...base, volume: 0 }, code: "INVALID_VOLUME" },
    { name: "a base amount is not a number", input: { ...base, totalFixed: "abc" }, code: "INVALID_AMOUNT" },
  ] as const)("returns $code when $name", ({ input, code }) => {
    const result = compareScenarios(input, [noOverrides]);

    expect(result).toEqual({ ok: false, code });
  });

  it.each([
    { name: "a manual price of zero", override: { priceOverride: "0" }, code: "INVALID_PRICE" },
    { name: "a negative manual price", override: { priceOverride: "-10" }, code: "INVALID_PRICE" },
    { name: "a manual price that is not a number", override: { priceOverride: "1,5" }, code: "INVALID_PRICE" },
    { name: "a volume of zero", override: { volumeOverride: 0 }, code: "INVALID_VOLUME" },
    { name: "a fractional volume", override: { volumeOverride: 2.5 }, code: "INVALID_VOLUME" },
  ] as const)("returns $code for $name", ({ override, code }) => {
    const result = compareScenarios(base, [{ ...noOverrides, id: "x", ...override }]);

    expect(result).toEqual({ ok: false, code });
  });

  it("returns only the base when there are no scenarios", () => {
    const result = compareScenarios(base, []);

    expect(result).toMatchObject({ ok: true, scenarios: [] });
  });
});

describe("realMarginPct", () => {
  it.each([
    ["5000", "4100", "18.00"],
    ["5857.14", "4100.00", "30.00"],
    ["2400", "4100", "-70.83"],
    ["4100", "4100", "0.00"],
  ])("returns the margin on a price of %s for a unit cost of %s (%s)", (price, unitCost, margin) => {
    expect(realMarginPct(price, unitCost)).toBe(margin);
  });

  it.each([
    ["0", "4100"],
    ["x", "4100"],
    ["5000", ""],
  ])("returns null when the price is %s and the unit cost %s", (price, unitCost) => {
    expect(realMarginPct(price, unitCost)).toBeNull();
  });
});
