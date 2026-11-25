import { describe, expect, it } from "vitest";

import type { PortfolioTotals } from "@/lib/calc/calculatePortfolioBreakEven";
import type { BreakEven, BreakEvenRow, BreakEvenStatus } from "@/lib/types/break-even";

import { buildBreakEvenChart } from "./buildBreakEvenChart";

function row(capacity: number, price: string): BreakEvenRow {
  return {
    id: `p-${capacity}-${price}`,
    name: `Producto ${price}`,
    capacity,
    mixPct: "0.0000",
    variableUnit: "0.00",
    indirectUnit: "0.00",
    unitCost: "0.00",
    fixedShare: "0.00",
    price,
    contributionUnit: "0.00",
    marginPct: "0.0000",
    breakEvenUnits: "0.0000",
    breakEvenSales: "0.00",
    breakEvenUnitsWhole: "0",
    hasNegativeContribution: false,
  };
}

// Validation example of #247: fixed costs $150.000; A capacity 200 at $1.400;
// B capacity 100 at $1.100; contribution ratio 0.461538; break-even $325.000.
const totals: PortfolioTotals = {
  capacity: 300,
  periodFixedCosts: "150000.00",
  indirectUnit: "500.00",
  weightedContribution: "600.0000",
  weightedPrice: "1300.0000",
  contributionRatio: "0.461538",
  breakEvenUnits: "250.0000",
  breakEvenUnitsWhole: "250",
  breakEvenSales: "325000.00",
  closingContribution: "150000.00",
};

function makeBreakEven(overrides: Partial<BreakEven> = {}): BreakEven {
  return {
    period: "2026-11",
    status: "ready",
    totalExpenses: "150000.00",
    rows: [row(200, "1400.00"), row(100, "1100.00")],
    totals,
    excluded: [],
    hasNegativeContribution: false,
    ...overrides,
  };
}

describe("buildBreakEvenChart", () => {
  it("builds the validation example of the issue", () => {
    const chart = buildBreakEvenChart(makeBreakEven());

    expect(chart).not.toBeNull();
    expect(chart?.range).toEqual({ min: "0.00", max: "487500.00" });
    expect(chart?.points).toEqual([
      { sales: "0.00", revenue: "0.00", totalCosts: "150000.00", fixedCosts: "150000.00" },
      {
        sales: "325000.00",
        revenue: "325000.00",
        totalCosts: "325000.00",
        fixedCosts: "150000.00",
      },
      {
        sales: "487500.00",
        revenue: "487500.00",
        totalCosts: "412500.00",
        fixedCosts: "150000.00",
      },
    ]);
    expect(chart?.breakEven).toEqual({
      sales: "325000.00",
      revenue: "325000.00",
      totalCosts: "325000.00",
    });
  });

  it("keeps the crossing inside when 1.5× break-even is the widest", () => {
    const chart = buildBreakEvenChart(
      makeBreakEven({
        totalExpenses: "300000.00",
        totals: { ...totals, periodFixedCosts: "300000.00", breakEvenSales: "650000.00" },
      }),
    );

    expect(chart?.range.max).toBe("975000.00");
    expect(chart?.breakEven.sales).toBe("650000.00");
    expect(Number(chart?.breakEven.sales)).toBeLessThanOrEqual(Number(chart?.range.max));
  });

  it("uses the full-capacity sales when it is wider than 1.5× break-even", () => {
    const chart = buildBreakEvenChart(
      makeBreakEven({
        rows: [row(100, "100.00")],
        totals: { ...totals, periodFixedCosts: "1000.00", breakEvenSales: "2000.00" },
      }),
    );

    expect(chart?.range.max).toBe("10000.00");
    expect(chart?.points.at(-1)?.sales).toBe("10000.00");
  });

  it("crosses at the engine break-even even though the ratio is rounded", () => {
    const chart = buildBreakEvenChart(makeBreakEven());

    // With the 6-decimal ratio the line would cross at 325000.15:
    // 150000 + 325000 × (1 − 0.461538). The engine's breakEvenSales is exact.
    expect(chart?.points[1]?.totalCosts).toBe("325000.00");
    expect(chart?.breakEven.totalCosts).toBe("325000.00");
  });

  const nonReady: BreakEvenStatus[] = [
    "no_products",
    "no_capacity",
    "no_expenses",
    "no_prices",
    "incomplete",
    "no_break_even",
  ];

  it.each(nonReady)("returns null when the status is %s", (status) => {
    expect(buildBreakEvenChart(makeBreakEven({ status, totals: null }))).toBeNull();
  });

  it("returns null when a ready state has no totals", () => {
    expect(buildBreakEvenChart(makeBreakEven({ totals: null }))).toBeNull();
  });
});
