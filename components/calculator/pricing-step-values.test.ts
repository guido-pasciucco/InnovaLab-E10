import { describe, expect, it } from "vitest";

import { toPricingStepValues, type PricingCosts } from "./pricing-step-values";

// Mockup example: fixed 320.000, variable 2.500, 200 units, unit cost 4.100.
const costs: PricingCosts = {
  unitCost: "4100.00",
  variableUnit: "2500.00",
  totalFixed: "320000.00",
  volume: 200,
};

describe("toPricingStepValues", () => {
  it("returns the mockup cards when the margin is 30", () => {
    expect(toPricingStepValues(costs, "30")).toEqual({
      marginValue: "30",
      marginIssue: null,
      marginLabel: "30",
      markupLabel: "42,9",
      unitCost: "$4.100",
      suggestedPrice: "$5.857,14",
      contributionUnit: "$3.357,14",
      estimatedProfit: "$351.428,57",
      profitIsNegative: false,
      lowContribution: false,
      missingCosts: false,
    });
  });

  it("reads a comma as the decimal mark when the margin is typed the Argentine way", () => {
    const values = toPricingStepValues(costs, "12,5");

    expect(values).toMatchObject({ marginValue: "12.5", marginLabel: "12,5", marginIssue: null });
  });

  it("returns the markup label without costs when the margin is valid", () => {
    expect(toPricingStepValues(null, "20").markupLabel).toBe("25");
  });

  it("returns no markup label when the margin is invalid", () => {
    expect(toPricingStepValues(costs, "100").markupLabel).toBeNull();
  });

  it("returns the rule message and dashes when the margin is 100", () => {
    const values = toPricingStepValues(costs, "100");

    expect(values).toMatchObject({
      marginValue: null,
      marginIssue: "El margen tiene que ser menor que 100 %.",
      suggestedPrice: "—",
      contributionUnit: "—",
      estimatedProfit: "—",
      unitCost: "$4.100",
    });
  });

  it("flags a low contribution when the price does not cover the variable cost", () => {
    const values = toPricingStepValues({ ...costs, unitCost: "1000.00" }, "10");

    expect(values).toMatchObject({ lowContribution: true, profitIsNegative: true });
  });

  it.each([
    { name: "there is no summary", input: null },
    { name: "there are no costs yet", input: { ...costs, unitCost: null, variableUnit: null } },
  ])("returns dashes and missingCosts when $name", ({ input }) => {
    const values = toPricingStepValues(input, "30");

    expect(values).toMatchObject({
      missingCosts: true,
      unitCost: "—",
      suggestedPrice: "—",
      lowContribution: false,
    });
  });
});
