import { describe, expect, it, vi } from "vitest";

import type { VerifiedUserId } from "./auth";
import type { Pricing, PricingRow } from "@/lib/types/pricing";

import { getBreakEvenService } from "./break-even";

const userId = "00000000-0000-4000-8000-000000000246" as VerifiedUserId;

function row(overrides: Partial<PricingRow> = {}): PricingRow {
  return {
    productId: "product-1",
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
  it("computes the official A/B example through the portfolio engine", async () => {
    const result = await get(
      pricing({
        totalExpenses: "150000.00",
        rows: [
          row({
            productId: "A",
            name: "A",
            capacity: 100,
            variableUnit: "1000.00",
            price: "1500.00",
          }),
          row({
            productId: "B",
            name: "B",
            capacity: 200,
            variableUnit: "925.00",
            price: "1675.00",
          }),
        ],
      }),
    );

    expect(result.status).toBe("ready");
    expect(result.rows).toEqual([
      expect.objectContaining({
        id: "A",
        breakEvenUnits: "75.0000",
        breakEvenUnitsWhole: "75",
        breakEvenSales: "112500.00",
      }),
      expect.objectContaining({
        id: "B",
        breakEvenUnits: "150.0000",
        breakEvenUnitsWhole: "150",
        breakEvenSales: "251250.00",
      }),
    ]);
    expect(result.totals).toMatchObject({
      breakEvenUnits: "225.0000",
      breakEvenUnitsWhole: "225",
      breakEvenSales: "363750.00",
      closingContribution: "150000.00",
    });
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
      { productId: "product-2", name: "Cuaderno", reason: "NO_CAPACITY" },
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
    await expect(get(pricing({ rows: [row({ capacity: -1 })] }))).rejects.toThrow(
      "Pricing returned invalid break-even input: INVALID_CAPACITY",
    );
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
    await expect(get(pricing({ rows: [input] }))).rejects.toThrow(
      "Pricing returned invalid break-even input: INVALID_AMOUNT",
    );
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
