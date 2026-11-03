import { describe, expect, it } from "vitest";

import { toBreakEvenStepProps } from "./break-even-step-values";
import type { PricingCosts } from "./pricing-step-values";

// Mockup example: fixed 320.000, variable 2.500, 200 units, unit cost 4.100,
// so a 30 % margin prices each unit at 5.857,14.
const costs: PricingCosts = {
  unitCost: "4100.00",
  variableUnit: "2500.00",
  totalFixed: "320000.00",
  volume: 200,
};

describe("toBreakEvenStepProps", () => {
  it("returns the mockup break-even and chart when the margin is 30", () => {
    expect(toBreakEvenStepProps(costs, "30")).toEqual({
      status: "ready",
      volume: 200,
      breakEvenUnits: 96,
      exceedsVolume: false,
      breakEvenSales: "558298.08",
      chart: {
        volume: 200,
        breakEvenUnits: 96,
        breakEvenSales: 558298.08,
        points: [
          { units: 0, revenue: 0, totalCost: 320000, fixedCost: 320000 },
          { units: 95.3192, revenue: 558298.08, totalCost: 558298.08, fixedCost: 320000 },
          { units: 200, revenue: 1171428, totalCost: 820000, fixedCost: 320000 },
        ],
        description:
          "Gráfico de punto de equilibrio. Ingresos y costos totales se cruzan en 96 unidades, con ventas de equilibrio de $ 558.298,08. Los costos fijos son de $ 320.000,00 y se mantienen iguales en todas las unidades.",
      },
    });
  });

  it("widens the chart to the break-even when it is beyond the estimated volume", () => {
    // Margin 0 prices at the unit cost: 2.600 − 2.500 = 100 per sale → 3.200 units.
    const props = toBreakEvenStepProps({ ...costs, unitCost: "2600.00" }, "0");

    expect(props).toMatchObject({
      status: "ready",
      volume: 200,
      breakEvenUnits: 3200,
      exceedsVolume: true,
      chart: {
        volume: 3200,
        breakEvenUnits: 3200,
        points: [
          { units: 0, revenue: 0, totalCost: 320000, fixedCost: 320000 },
          { units: 200, revenue: 520000, totalCost: 820000, fixedCost: 320000 },
          { units: 3200, revenue: 8320000, totalCost: 8320000, fixedCost: 320000 },
        ],
      },
    });
  });

  it("adds a last point at the whole units when the exact break-even is beyond the volume", () => {
    // 2.603 − 2.500 = 103 per sale → 3.106,7961 units, 3.107 to sell.
    const props = toBreakEvenStepProps({ ...costs, unitCost: "2603.00" }, "0");

    expect(props.status === "ready" && props.chart.points.map((point) => point.units)).toEqual([
      0, 200, 3106.7961, 3107,
    ]);
    expect(props).toMatchObject({ chart: { volume: 3107 } });
  });

  it("returns missing-margin when no margin was saved", () => {
    expect(toBreakEvenStepProps(costs, null)).toEqual({ status: "missing-margin" });
  });

  it("returns missing-margin when the saved margin has no price", () => {
    expect(toBreakEvenStepProps(costs, "100")).toEqual({ status: "missing-margin" });
  });

  it.each([
    { name: "there is no summary", input: null },
    { name: "there are no costs yet", input: { ...costs, unitCost: null, variableUnit: null } },
    { name: "the volume is missing", input: { ...costs, volume: null } },
  ])("returns missing-costs when $name", ({ input }) => {
    expect(toBreakEvenStepProps(input, "30")).toEqual({ status: "missing-costs" });
  });

  it("returns missing-costs before missing-margin when both are missing", () => {
    expect(toBreakEvenStepProps(null, null)).toEqual({ status: "missing-costs" });
  });

  it("returns no-contribution when the price does not cover the variable cost", () => {
    const props = toBreakEvenStepProps({ ...costs, unitCost: "1000.00" }, "10");

    expect(props).toEqual({ status: "no-contribution" });
  });
});
