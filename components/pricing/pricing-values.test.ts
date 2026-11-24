import { describe, expect, it } from "vitest";

import type { Pricing, PricingRow } from "@/lib/types/pricing";
import {
  formatMarkup,
  formatMarkupInput,
  formatPeriod,
  NOT_AVAILABLE,
  toPricingView,
} from "./pricing-values";

function row(overrides: Partial<PricingRow> = {}): PricingRow {
  return {
    rowId: "product-1",
    productId: "product-1",
    presentationId: null,
    editHref: "/products",
    name: "Pan flauta",
    capacity: 120,
    variableUnit: "15.63",
    variableUnavailableCode: null,
    unitCost: "7000",
    ownMarkupPercent: null,
    markupPercent: "30.00",
    markupSource: "business",
    price: "9100.00",
    profitUnit: "2100.00",
    realMarginPct: "23.0769",
    unavailableCode: null,
    ...overrides,
  };
}

function pricing(overrides: Partial<Pricing> = {}): Pricing {
  return {
    period: "2026-11",
    status: "ready",
    totalExpenses: "120000.00",
    defaultMarkupPercent: "30.00",
    rows: [row()],
    ...overrides,
  };
}

describe("pricing values", () => {
  it("shows price, profit and real margin with the agreed formatting", () => {
    const view = toPricingView(pricing());

    expect(view.periodLabel).toBe("noviembre de 2026");
    expect(view.rows[0]).toMatchObject({
      unitCost: "$ 7.000,00",
      markupDisplay: "30,00 %",
      markupSourceLabel: "Del negocio",
      suggestedPrice: "$ 9.100,00",
      profit: "$ 2.100,00",
      realMargin: "23,08 %",
      note: null,
    });
  });

  it("rounds exact engine decimals only when displaying money", () => {
    const view = toPricingView(
      pricing({
        rows: [row({ unitCost: "1390.63", price: "1807.82", profitUnit: "417.19", realMarginPct: "23.0769" })],
      }),
    );

    expect(view.rows[0].suggestedPrice).toBe("$ 1.807,82");
    expect(view.rows[0].profit).toBe("$ 417,19");
    expect(view.rows[0].realMargin).toBe("23,08 %");
  });

  it("distinguishes the loaded markup from the real margin", () => {
    expect(formatMarkup("12.5")).toBe("12,50 %");
    expect(formatMarkupInput("12.5")).toBe("12.50");
    expect(formatMarkup(null)).toBe(NOT_AVAILABLE);
    expect(formatMarkupInput(null)).toBe("");
  });

  it("asks for a markup instead of showing a price", () => {
    const view = toPricingView(
      pricing({
        defaultMarkupPercent: null,
        rows: [
          row({
            markupPercent: null,
            markupSource: "none",
            price: null,
            profitUnit: null,
            realMarginPct: null,
            unavailableCode: "NO_MARKUP",
          }),
        ],
      }),
    );

    expect(view.rows[0]).toMatchObject({
      suggestedPrice: NOT_AVAILABLE,
      profit: NOT_AVAILABLE,
      realMargin: NOT_AVAILABLE,
      markupDisplay: NOT_AVAILABLE,
      markupSourceLabel: "Sin cargar",
      note: "Cargá un recargo para ver el precio sugerido.",
    });
  });

  it("explains a missing total cost without showing a zero price", () => {
    const view = toPricingView(
      pricing({
        rows: [
          row({
            unitCost: null,
            price: null,
            profitUnit: null,
            realMarginPct: null,
            unavailableCode: "NO_TOTAL_COST",
            variableUnavailableCode: "MISSING_YIELD",
          }),
        ],
      }),
    );

    expect(view.rows[0].unitCost).toBe(NOT_AVAILABLE);
    expect(view.rows[0].note).toBe("Falta el rendimiento de la receta.");
  });

  it.each([
    ["no_capacity", "Cargar capacidad", "/products"],
    ["no_expenses", "Cargar gastos del período", "/period-costs"],
    ["unavailable", "Completar recetas", "/products"],
  ] as const)("shows the %s empty state with a link", (status, label, href) => {
    const view = toPricingView(pricing({ status }));

    expect(view.banner).toMatchObject({ action: { href, label } });
  });

  it("has no banner when the distribution is ready", () => {
    expect(toPricingView(pricing()).banner).toBeNull();
  });

  it("keeps the period label deterministic", () => {
    expect(formatPeriod("2026-01")).toBe("enero de 2026");
    expect(formatPeriod("bad-period")).toBe("bad-period");
  });
});
