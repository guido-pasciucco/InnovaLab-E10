import { describe, expect, it } from "vitest";

import type { CostDistribution, CostDistributionRow } from "@/lib/services/cost-distribution";

import { formatPeriod, formatShare, toCostDistributionView } from "./cost-distribution-values";

function row(overrides: Partial<CostDistributionRow>): CostDistributionRow {
  return {
    rowId: "p1",
    productId: "p1",
    presentationId: null,
    ownMarkupPercent: null,
    editHref: "/products",
    name: "Pan",
    capacity: 180,
    absorbsExpenses: true,
    share: "0.9000",
    variableUnit: "3200.00",
    variableUnavailableCode: null,
    indirectUnit: "1650.00",
    fixedShare: "297000.00",
    unitCost: "4850.00",
    ...overrides,
  };
}

function distribution(overrides: Partial<CostDistribution>): CostDistribution {
  return {
    period: "2026-11",
    status: "ready",
    totalExpenses: "330000.00",
    rows: [row({})],
    ...overrides,
  };
}

describe("toCostDistributionView", () => {
  it("writes every figure of a ready distribution with its currency format", () => {
    const view = toCostDistributionView(
      distribution({
        rows: [
          row({}),
          row({
            productId: "p2",
            name: "Facturas",
            capacity: 20,
            share: "0.1000",
            variableUnit: "9800.00",
            fixedShare: "33000.00",
            unitCost: "11450.00",
          }),
        ],
      }),
    );

    expect(view.periodLabel).toBe("noviembre de 2026");
    expect(view.totalExpenses).toBe("$ 330.000,00");
    expect(view.banner).toBeNull();
    expect(view.rows[0]).toEqual({
      id: "p1",
      name: "Pan",
      capacity: "180 u./mes",
      share: "90 %",
      variableUnit: "$ 3.200,00",
      indirectUnit: "$ 1.650,00",
      fixedShare: "$ 297.000,00",
      unitCost: "$ 4.850,00",
      note: null,
      noteHref: null,
    });
    expect(view.explanation).toEqual({
      totalExpenses: "$ 330.000,00",
      capacitySum: "200 u./mes",
      indirectUnit: "$ 1.650,00",
    });
  });

  it("shows No disponible with the reason, never $ 0, when a product has no variable cost", () => {
    const view = toCostDistributionView(
      distribution({
        rows: [
          row({}),
          row({
            productId: "p2",
            name: "Sin receta",
            capacity: 20,
            share: "0.1000",
            variableUnit: null,
            unitCost: null,
          }),
        ],
      }),
    );

    expect(view.rows[1]).toMatchObject({
      variableUnit: "No disponible",
      unitCost: "No disponible",
      note: "Sin receta: no hay costo variable para sumar.",
    });
    expect(view.hasPartialRows).toBe(true);
  });

  it("explains a missing recipe yield", () => {
    const view = toCostDistributionView(
      distribution({
        rows: [row({ variableUnit: null, unitCost: null, variableUnavailableCode: "MISSING_YIELD" })],
      }),
    );

    expect(view.rows[0].note).toBe("Falta el rendimiento de la receta.");
  });

  it("marks a product without capacity as left out of the spread", () => {
    const view = toCostDistributionView(
      distribution({
        rows: [
          row({}),
          row({
            productId: "p2",
            name: "Sin capacidad",
            capacity: null,
            absorbsExpenses: false,
            share: null,
            indirectUnit: null,
            fixedShare: null,
            unitCost: null,
          }),
        ],
      }),
    );

    expect(view.rows[1]).toMatchObject({
      capacity: "Sin cargar",
      share: "No disponible",
      fixedShare: "No disponible",
      unitCost: "No disponible",
      note: "Sin capacidad mensual: no entra en el reparto.",
    });
  });

  it.each([
    { status: "no_capacity", title: "Falta la capacidad mensual", href: "/products" },
    { status: "no_expenses", title: "Faltan los gastos del período", href: "/period-costs" },
    { status: "unavailable", title: "Falta el costo variable de tus productos", href: "/products" },
  ] as const)("shows the $status banner with a way to fix it and no explanation", ({ status, title, href }) => {
    const view = toCostDistributionView(
      distribution({
        status,
        rows: [row({ absorbsExpenses: false, share: null, indirectUnit: null, fixedShare: null, unitCost: null })],
      }),
    );

    expect(view.banner).toMatchObject({ title, action: { href } });
    if (status !== "unavailable") expect(view.explanation).toBeNull();
  });
});

describe("formatShare", () => {
  it.each([
    ["0.9000", "90 %"],
    ["1.0000", "100 %"],
    ["0.3333", "33,33 %"],
    ["0.0625", "6,25 %"],
    [null, "No disponible"],
  ])("writes %s as %s", (share, expected) => {
    expect(formatShare(share)).toBe(expected);
  });
});

describe("formatPeriod", () => {
  it("writes the month in Spanish and leaves an unexpected key unchanged", () => {
    expect(formatPeriod("2026-11")).toBe("noviembre de 2026");
    expect(formatPeriod("noviembre")).toBe("noviembre");
  });
});
