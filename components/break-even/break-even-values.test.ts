import { describe, expect, it } from "vitest";

import type { BreakEven, BreakEvenRow, BreakEvenStatus } from "@/lib/types/break-even";

import { toBreakEvenView } from "./break-even-values";

function row(overrides: Partial<BreakEvenRow> = {}): BreakEvenRow {
  return {
    id: "a",
    name: "Producto A",
    capacity: 100,
    mixPct: "33.3333",
    variableUnit: "1000.00",
    indirectUnit: "500.00",
    unitCost: "1500.00",
    fixedShare: "50000.00",
    price: "1800.00",
    contributionUnit: "800.00",
    marginPct: "16.6667",
    breakEvenUnits: "62.5000",
    breakEvenUnitsWhole: "63",
    breakEvenSales: "112500.00",
    hasNegativeContribution: false,
    ...overrides,
  };
}

function result(overrides: Partial<BreakEven> = {}): BreakEven {
  return {
    period: "2026-11",
    status: "ready",
    totalExpenses: "150000.00",
    rows: [row()],
    totals: {
      capacity: 300,
      periodFixedCosts: "150000.00",
      indirectUnit: "500.00",
      weightedContribution: "666.6667",
      weightedPrice: "1616.6667",
      contributionRatio: "0.412371",
      breakEvenUnits: "225.0000",
      breakEvenUnitsWhole: "225",
      breakEvenSales: "363750.00",
      closingContribution: "150000.00",
    },
    excluded: [],
    hasNegativeContribution: false,
    ...overrides,
  };
}

describe("toBreakEvenView", () => {
  it("formats the ready summary, table quota and closing check", () => {
    const view = toBreakEvenView(result());

    expect(view.summary).toEqual({
      expenses: "$ 150.000,00",
      units: "225 unidades",
      sales: "$ 363.750,00",
    });
    expect(view.rows[0]).toMatchObject({
      price: "$ 1.800,00",
      marginPct: "16,67 %",
      mixPct: "33,33 %",
      quotaWhole: "63 u.",
      quotaExact: "62,5 u. exactas",
    });
    expect(view.closingContribution).toBe("$ 150.000,00");
    expect(view.expenses).toBe("$ 150.000,00");
  });

  it.each([
    ["no_products", "Todavía no cargaste productos"],
    ["no_capacity", "Falta la capacidad mensual"],
    ["no_expenses", "Faltan los gastos del mes"],
    ["no_prices", "Faltan los precios"],
    ["incomplete", "Hay datos pendientes"],
    ["no_break_even", "No se alcanza el punto de equilibrio"],
  ] as const)("maps the %s state to actionable content", (status, title) => {
    const view = toBreakEvenView(
      result({ status: status as BreakEvenStatus, rows: [], totals: null }),
    );
    expect(view.banner).toMatchObject({ title });
    expect(view.banner?.href).not.toBe("/pricing");
    expect(view.summary).toBeNull();
    expect(view.rows).toEqual([]);
  });

  it("explains exclusions and negative contribution warnings", () => {
    const view = toBreakEvenView(
      result({
        rows: [row({ hasNegativeContribution: true })],
        hasNegativeContribution: true,
        excluded: [
          { rowId: "b", productId: "b", name: "Producto B", reason: "NO_CAPACITY" },
          { rowId: "c", productId: "c", name: "Producto C", reason: "NO_VARIABLE_COST" },
          { rowId: "d", productId: "d", name: "Producto D", reason: "NO_PRICE" },
        ],
      }),
    );

    expect(view.hasNegativeContribution).toBe(true);
    expect(view.rows[0].hasNegativeContribution).toBe(true);
    expect(view.exclusions.map(({ message, href }) => [message, href])).toEqual([
      ["Sin capacidad mensual: no participa de la mezcla.", "/products"],
      ["Sin costo variable: completá su receta.", "/products"],
      ["Sin precio: cargale un recargo.", "/precios"],
    ]);
  });
});
