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

  it("keeps the fixed total but hides per-unit amounts when the typed volume differs", () => {
    expect(toLiveCostCardValues(summary, 24)).toEqual({
      volume: 24,
      fixedCosts: "1000.00",
      unitCost: undefined,
      variablePerUnit: undefined,
    });
  });

  it("hides per-unit amounts while the volume field is empty or invalid", () => {
    expect(toLiveCostCardValues(summary, undefined)).toEqual({
      volume: undefined,
      fixedCosts: "1000.00",
      unitCost: undefined,
      variablePerUnit: undefined,
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

  it("keeps a zero amount instead of treating it as missing", () => {
    expect(
      toLiveCostCardValues({ ...summary, totalFixed: "0.00", variableUnit: "0.00" }, 12),
    ).toMatchObject({ fixedCosts: "0.00", variablePerUnit: "0.00" });
  });
});
