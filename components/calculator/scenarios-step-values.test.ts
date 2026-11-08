import { describe, expect, it } from "vitest";

import { compareScenarios } from "@/lib/calc/compareScenarios";
import type { CalculatorScenario, ScenarioComparisonInputs } from "@/lib/types/calculator";

import {
  breakEvenDeltaLabel,
  marginDeltaLabel,
  percentLabel,
  profitDeltaLabel,
  toInflationValues,
  toScenariosStepValues,
} from "./scenarios-step-values";

// Mockup example: fixed 320.000, variable 2.500, 200 units, 30 % margin.
const inputs: ScenarioComparisonInputs = {
  totalFixed: "320000.00",
  variableUnit: "2500.00",
  unitCost: "4100.00",
  volume: 200,
  marginPct: "30",
};

const base: CalculatorScenario = {
  id: "base",
  name: "Base",
  isBase: true,
  priceOverride: null,
  volumeOverride: null,
};

const roundPrice: CalculatorScenario = {
  id: "a",
  name: "Precio redondo",
  isBase: false,
  priceOverride: "5000",
  volumeOverride: null,
};

describe("toScenariosStepValues", () => {
  it("returns the mockup columns with the deltas worded against the base", () => {
    const scenarios = [base, roundPrice];

    const values = toScenariosStepValues({ scenarios, comparison: compareScenarios(inputs, scenarios) });

    expect(values.status).toBe("ready");
    expect(values.columns?.[0]).toMatchObject({
      name: "Base",
      price: { value: "$5.857,14", delta: null },
      realMargin: { value: "30 %", delta: null },
      estimatedProfit: { value: "$351.428,57", delta: null },
      breakEvenUnits: { value: "96", delta: null },
    });
    expect(values.columns?.[1]).toMatchObject({
      name: "Precio redondo",
      price: { value: "$5.000" },
      realMargin: { value: "18 %", delta: "12 puntos menos que la base" },
      estimatedProfit: { value: "$180.000", delta: "$171.428,57 menos que la base" },
      breakEvenUnits: { value: "128", delta: "32 más que la base" },
    });
  });

  it("shows Sin equilibrio and no break-even delta when the price does not cover the variable cost", () => {
    const low = { ...roundPrice, priceOverride: "2400" };
    const scenarios = [base, low];

    const values = toScenariosStepValues({ scenarios, comparison: compareScenarios(inputs, scenarios) });

    expect(values.columns?.[1].breakEvenUnits).toEqual({ value: "Sin equilibrio", delta: null });
  });

  it("returns missing-inputs while there is no comparison", () => {
    expect(toScenariosStepValues({ scenarios: [base], comparison: null })).toEqual({
      status: "missing-inputs",
      columns: null,
    });
  });

  it("returns invalid when the engine rejects the inputs", () => {
    const comparison = compareScenarios({ ...inputs, marginPct: "100" }, [base]);

    expect(toScenariosStepValues({ scenarios: [base], comparison })).toEqual({
      status: "invalid",
      columns: null,
    });
  });
});

describe("delta labels", () => {
  it.each([
    ["-12.00", "12 puntos menos que la base"],
    ["2.50", "2,5 puntos más que la base"],
    ["1.00", "1 punto más que la base"],
    ["0.00", "Igual que la base"],
  ])("words a margin delta of %s as %s", (points, label) => {
    expect(marginDeltaLabel(points)).toBe(label);
  });

  it.each([
    ["-171428.57", "$171.428,57 menos que la base"],
    ["53571.43", "$53.571,43 más que la base"],
    ["0.00", "Igual que la base"],
  ])("words a profit delta of %s as %s", (profit, label) => {
    expect(profitDeltaLabel(profit)).toBe(label);
  });

  it.each([
    ["32", "32 más que la base"],
    ["-4", "4 menos que la base"],
    ["0", "Igual que la base"],
    [null, null],
  ])("words a break-even delta of %s as %s", (units, label) => {
    expect(breakEvenDeltaLabel(units)).toBe(label);
  });

  it.each([
    ["30.00", "30 %"],
    ["25.73", "25,73 %"],
    ["-70.83", "-70,83 %"],
  ])("renders the percent %s as %s", (value, label) => {
    expect(percentLabel(value)).toBe(label);
  });
});

describe("toInflationValues", () => {
  it("returns the two mockup sentences when the increase is 10 %", () => {
    expect(toInflationValues(inputs, "10")).toEqual({
      issue: null,
      summary:
        "Si no actualizás el precio, tu margen baja de 30 % a 25,73 % y tu ganancia, de $351.428,57 a $301.428,57.",
      keepMargin: "Para mantener un 30 % tendrías que cobrar $6.214,29 (+6,1 %).",
    });
  });

  it("reads a comma as the decimal mark", () => {
    expect(toInflationValues(inputs, "10,0").issue).toBeNull();
  });

  it.each(["-5", "x", ""])("returns the issue when the increase is %j", (text) => {
    expect(toInflationValues(inputs, text)).toEqual({
      issue: "Escribí un porcentaje igual o mayor que 0.",
      summary: null,
      keepMargin: null,
    });
  });
});
