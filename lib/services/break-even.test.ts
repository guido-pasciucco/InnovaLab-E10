import { describe, expect, it, vi } from "vitest";

import type { VerifiedUserId } from "./auth";
import type { Pricing, PricingRow } from "@/lib/types/pricing";

import { getBreakEvenService } from "./break-even";

const userId = "00000000-0000-4000-8000-000000000246" as VerifiedUserId;

function row(overrides: Partial<PricingRow> = {}): PricingRow {
  const productId = overrides.productId ?? "product-1";
  return {
    rowId: overrides.rowId ?? productId,
    productId,
    presentationId: overrides.presentationId ?? null,
    editHref: overrides.editHref ?? "/products",
    name: "Cuaderno",
    capacity: 100,
    variableUnit: "500.00",
    variableUnavailableCode: null,
    unitCost: "600.00",
    ownMarkupPercent: "50.00",
    markupPercent: "50.00",
    markupSource: "product",
    price: "900.00",
    profitUnit: "300.00",
    realMarginPct: "33.3333",
    unavailableCode: null,
    ...overrides,
  };
}

function pricing(overrides: Partial<Pricing> = {}): Pricing {
  return {
    period: "2026-11",
    status: "ready",
    totalExpenses: "10000.00",
    defaultMarkupPercent: "50.00",
    rows: [row()],
    ...overrides,
  };
}

async function get(value: Pricing) {
  const getPricing = vi.fn().mockResolvedValue(value);
  const result = await getBreakEvenService(userId, { getPricing });
  expect(getPricing).toHaveBeenCalledOnce();
  expect(getPricing).toHaveBeenCalledWith(userId);
  return result;
}

describe("getBreakEvenService", () => {
  // Validation example of issue #246: expenses $ 150.000, A 200 / $ 800 /
  // $ 1.400 and B 100 / $ 500 / $ 1.100.
  const issueRows = (overrides: { b?: Partial<PricingRow>; a?: Partial<PricingRow> } = {}) => [
    row({ productId: "A", name: "A", capacity: 200, variableUnit: "800.00", price: "1400.00", ...overrides.a }),
    row({ productId: "B", name: "B", capacity: 100, variableUnit: "500.00", price: "1100.00", ...overrides.b }),
  ];

  it("computes the validation example of the issue", async () => {
    const result = await get(pricing({ totalExpenses: "150000.00", rows: issueRows() }));

    expect(result.status).toBe("ready");
    expect(result.rows).toEqual([
      expect.objectContaining({
        id: "A",
        mixPct: "66.6667",
        indirectUnit: "500.00",
        unitCost: "1300.00",
        contributionUnit: "600.00",
        marginPct: "7.1429",
        breakEvenUnits: "166.6667",
        breakEvenUnitsWhole: "167",
        hasNegativeContribution: false,
      }),
      expect.objectContaining({
        id: "B",
        mixPct: "33.3333",
        indirectUnit: "500.00",
        unitCost: "1000.00",
        contributionUnit: "600.00",
        marginPct: "9.0909",
        breakEvenUnits: "83.3333",
        breakEvenUnitsWhole: "84",
        hasNegativeContribution: false,
      }),
    ]);
    expect(result.totals).toMatchObject({
      weightedContribution: "600.0000",
      breakEvenUnits: "250.0000",
      breakEvenSales: "325000.00",
      closingContribution: "150000.00",
    });
  });

  it("variant: a negative contribution is flagged and the break-even still computes", async () => {
    const result = await get(
      pricing({ totalExpenses: "150000.00", rows: issueRows({ b: { price: "400.00" } }) }),
    );

    expect(result.status).toBe("ready");
    expect(result.hasNegativeContribution).toBe(true);
    expect(result.rows.map((r) => [r.id, r.contributionUnit, r.hasNegativeContribution])).toEqual([
      ["A", "600.00", false],
      ["B", "-100.00", true],
    ]);
    expect(result.totals).toMatchObject({ weightedContribution: "366.6667" });
  });

  it("variant: a price equal to the variable cost is flagged too", async () => {
    const result = await get(
      pricing({ totalExpenses: "150000.00", rows: issueRows({ b: { price: "500.00" } }) }),
    );

    expect(result.hasNegativeContribution).toBe(true);
    expect(result.rows.map((r) => [r.id, r.contributionUnit, r.hasNegativeContribution])).toEqual([
      ["A", "600.00", false],
      ["B", "0.00", true],
    ]);
  });

  it("variant: without a reachable break-even no figure is shown", async () => {
    const result = await get(
      pricing({
        totalExpenses: "150000.00",
        rows: issueRows({ a: { price: "700.00" }, b: { price: "400.00" } }),
      }),
    );

    expect(result).toMatchObject({ status: "no_break_even", rows: [], totals: null });
  });

  it("variant: a product without capacity is excluded and A and B do not change", async () => {
    const result = await get(
      pricing({
        totalExpenses: "150000.00",
        rows: [...issueRows(), row({ productId: "C", name: "C", capacity: 0 })],
      }),
    );

    expect(result.status).toBe("ready");
    expect(result.excluded).toEqual([
      { rowId: "C", productId: "C", name: "C", reason: "NO_CAPACITY", editHref: "/products" },
    ]);
    expect(result.rows.map((r) => r.breakEvenUnitsWhole)).toEqual(["167", "84"]);
    expect(result.totals).toMatchObject({ breakEvenSales: "325000.00" });
  });

  it("variant: a product with capacity and no price leaves the mix incomplete", async () => {
    const result = await get(
      pricing({
        totalExpenses: "150000.00",
        rows: [...issueRows(), row({ productId: "C", name: "C", capacity: 50, price: null })],
      }),
    );

    expect(result).toMatchObject({ status: "incomplete", rows: [], totals: null });
    expect(result.excluded).toEqual([{ rowId: "C", productId: "C", name: "C", reason: "NO_PRICE" }]);
  });

  it("rounds a quota just above an integer from unrounded inputs", async () => {
    const result = await get(
      pricing({
        totalExpenses: "10000.00",
        rows: [
          row({ capacity: 10000, variableUnit: "0.01", price: "100.00" }),
          row({
            productId: "product-2",
            capacity: 1,
            variableUnit: "0.01",
            price: "100.00",
          }),
        ],
      }),
    );

    expect(result.rows[0]).toMatchObject({
      breakEvenUnits: "100.0000",
      breakEvenUnitsWhole: "101",
    });
    expect(result.totals).toMatchObject({
      breakEvenUnitsWhole: "101",
      closingContribution: "10000.00",
    });
  });

  it("keeps fractional exact quotas and rounds each whole quota upward", async () => {
    const result = await get(
      pricing({
        rows: [
          row({ capacity: 2 }),
          row({ productId: "product-2", name: "Agenda", capacity: 1 }),
        ],
      }),
    );

    expect(result.rows.map(({ breakEvenUnits, breakEvenUnitsWhole }) => [breakEvenUnits, breakEvenUnitsWhole])).toEqual([
      ["16.6667", "17"],
      ["8.3333", "9"],
    ]);
  });

  it("excludes products without capacity while preserving the remaining mix", async () => {
    const result = await get(
      pricing({ rows: [row(), row({ productId: "product-2", capacity: null })] }),
    );

    expect(result.status).toBe("ready");
    expect(result.rows).toHaveLength(1);
    expect(result.excluded).toEqual([
      { rowId: "product-2", productId: "product-2", name: "Cuaderno", reason: "NO_CAPACITY", editHref: "/products" },
    ]);
  });

  it("reports an incomplete mix and every blocking exclusion", async () => {
    const result = await get(
      pricing({
        rows: [
          row(),
          row({ productId: "product-2", variableUnit: null }),
          row({ productId: "product-3", price: null }),
        ],
      }),
    );

    expect(result.status).toBe("incomplete");
    expect(result.excluded.map(({ reason }) => reason)).toEqual(["NO_VARIABLE_COST", "NO_PRICE"]);
    expect(result.rows).toEqual([]);
    expect(result.totals).toBeNull();
  });

  it("allows one negative contribution when the weighted mix remains positive", async () => {
    const result = await get(
      pricing({
        rows: [
          row({ capacity: 3, variableUnit: "500.00", price: "900.00" }),
          row({ productId: "product-2", capacity: 1, variableUnit: "700.00", price: "600.00" }),
        ],
      }),
    );

    expect(result.status).toBe("ready");
    expect(result.hasNegativeContribution).toBe(true);
    expect(result.rows.map(({ hasNegativeContribution }) => hasNegativeContribution)).toEqual([false, true]);
  });

  it("does not silently omit a negative capacity", async () => {
    await expect(get(pricing({ rows: [row({ capacity: -1 })] }))).rejects.toMatchObject({
      code: "CALC_BREAK_EVEN_FAILED",
      details: { reason: "INVALID_CAPACITY" },
    });
  });

  it.each([
    ["an empty price", row({ price: "" }), "no_prices"],
    ["a zero price", row({ price: "0.00" }), "no_prices"],
    ["a negative price", row({ price: "-0.01" }), "no_prices"],
  ] as const)("handles %s through the engine contract", async (_label, input, status) => {
    expect(await get(pricing({ rows: [input] }))).toMatchObject({ status });
  });

  it.each([
    ["a malformed price", row({ price: "not-money" })],
    ["a malformed variable cost", row({ variableUnit: "not-money" })],
  ] as const)("rejects %s as invalid engine input", async (_label, input) => {
    await expect(get(pricing({ rows: [input] }))).rejects.toMatchObject({
      code: "CALC_BREAK_EVEN_FAILED",
      details: { reason: "INVALID_AMOUNT" },
    });
  });

  it.each([
    ["no_products", pricing({ rows: [] })],
    ["no_capacity", pricing({ rows: [row({ capacity: 0 })] })],
    ["no_expenses", pricing({ totalExpenses: "0.00" })],
    ["no_prices", pricing({ rows: [row({ price: null })] })],
    [
      "no_break_even",
      pricing({ rows: [row({ variableUnit: "900.00", price: "800.00" })] }),
    ],
  ] as const)("returns the %s state without figures", async (status, input) => {
    const result = await get(input);
    expect(result).toMatchObject({ status, rows: [], totals: null });
  });
});
