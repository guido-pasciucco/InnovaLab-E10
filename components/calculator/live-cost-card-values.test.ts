import { describe, expect, it } from "vitest";

import type { CalculatorCostSummary } from "@/lib/types/calculator";

import { toLiveCostCardValues } from "./live-cost-card-values";

const summary: CalculatorCostSummary = {
  calculationId: "calc-1",
  totalFixed: "1000.00",
  variableUnit: "200.00",
  unitCost: "283.33",
  volume: 12,
  currency: "ARS",
};

const emptySummary: CalculatorCostSummary = {
  calculationId: "calc-1",
  totalFixed: null,
  variableUnit: null,
  unitCost: null,
  volume: 12,
  currency: "ARS",
};

describe("toLiveCostCardValues", () => {
  it("passes every amount through when the typed volume is the persisted one", () => {
    expect(toLiveCostCardValues(summary, 12)).toEqual({
      volume: 12,
      fixedCosts: "1000.00",
      unitCost: "283.33",
      variablePerUnit: "200.00",
    });
  });

  // The variable per-unit amount comes from each purchase and its yield, not
  // from the volume, so only the unit cost (fixed / volume) goes stale.
  it("keeps the fixed total and the variable per unit but hides the unit cost when the typed volume differs", () => {
    expect(toLiveCostCardValues(summary, 24)).toEqual({
      volume: 24,
      fixedCosts: "1000.00",
      unitCost: undefined,
      variablePerUnit: "200.00",
    });
  });

  it("hides the unit cost while the volume field is empty or invalid", () => {
    expect(toLiveCostCardValues(summary, undefined)).toEqual({
      volume: undefined,
      fixedCosts: "1000.00",
      unitCost: undefined,
      variablePerUnit: "200.00",
    });
  });

  it("turns null amounts (no costs yet) into undefined", () => {
    expect(toLiveCostCardValues(emptySummary, 12)).toEqual({
      volume: 12,
      fixedCosts: undefined,
      unitCost: undefined,
      variablePerUnit: undefined,
    });
  });

  it("only mirrors the typed volume when there is no summary", () => {
    expect(toLiveCostCardValues(null, 5)).toEqual({
      volume: 5,
      fixedCosts: undefined,
      unitCost: undefined,
      variablePerUnit: undefined,
    });
  });

  it("keeps a zero fixed total instead of treating it as missing", () => {
    expect(
      toLiveCostCardValues({ ...summary, totalFixed: "0.00" }, 12),
    ).toMatchObject({ fixedCosts: "0.00" });
  });

  it("shows dashes per unit while there are only fixed costs", () => {
    expect(
      toLiveCostCardValues(
        { ...summary, variableUnit: "0.00", unitCost: "83.33" },
        12,
      ),
    ).toEqual({
      volume: 12,
      fixedCosts: "1000.00",
      unitCost: undefined,
      variablePerUnit: undefined,
    });
  });
});
