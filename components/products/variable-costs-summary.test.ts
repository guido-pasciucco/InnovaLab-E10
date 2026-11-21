import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VariableCostsSummary } from "./variable-costs-summary";

const costs = {
  ok: true as const,
  ingredientsCost: "10.00",
  recipeYield: "1",
  unitCost: "10.00",
  unitCostCalculationValue: "1/10000000",
  exact: {
    ingredientsCost: { numerator: "10", denominator: "1" },
    unitCost: { numerator: "10", denominator: "1" },
  },
  presentations: [
    {
      id: "individual",
      name: "Presentación con un nombre muy largo para comprobar el ajuste móvil",
      unitsPerPresentation: "1",
      productCost: "10.00",
      packagingCost: "0.01",
      packagingItemsAdjustment: "-0.01",
      roundingAdjustment: "0.00",
      totalCost: "10.01",
      exact: {
        productCost: { numerator: "10", denominator: "1" },
        packagingCost: { numerator: "1", denominator: "100" },
        totalCost: { numerator: "1001", denominator: "100" },
      },
      packaging: [
        { supplyId: "7c12dafa-0101-4bde-9ee0-91ed4b2db4b8", quantity: "1", unit: "unidad", cost: "0.01", exactCost: { numerator: "1", denominator: "200" } },
        { supplyId: "7c12dafa-0101-4bde-9ee0-91ed4b2db4b9", quantity: "1", unit: "unidad", cost: "0.01", exactCost: { numerator: "1", denominator: "200" } },
      ],
    },
  ],
};

function render(overrides: Partial<React.ComponentProps<typeof VariableCostsSummary>> = {}) {
  return renderToStaticMarkup(createElement(VariableCostsSummary, {
    productName: "Producto de prueba",
    costs,
    ...overrides,
  }));
}

describe("VariableCostsSummary", () => {
  it("shows the engine reconciliation instead of silently changing a rounded component", () => {
    const html = render();

    expect(html).toContain("Ajuste de redondeo del packaging");
    expect(html).toContain("$ -0,01");
    expect(html).toContain("Subtotal de packaging");
    expect(html).toContain("$ 10,01");
    expect(html).toContain("Costo variable final");
  });

  it("uses readable calculation precision, singular units and no raw supply identifier", () => {
    const html = render();

    expect(html).toContain("1/10000000");
    expect(html).not.toContain("$ 1e-7,00");
    expect(html).toContain("1 unidad elaborada");
    expect(html).toContain("Insumo de packaging");
    expect(html).not.toContain("7c12dafa-0101-4bde-9ee0-91ed4b2db4b8");
    expect(html).not.toContain("7c12dafa-0101-4bde-9ee0-91ed4b2db4b9");
  });

  it("labels known packaging without exposing its identifier", () => {
    const html = render({ supplyNames: { "7c12dafa-0101-4bde-9ee0-91ed4b2db4b8": "Caja individual" } });

    expect(html).toContain("Caja individual");
    expect(html).not.toContain("7c12dafa-0101-4bde-9ee0-91ed4b2db4b8");
  });

  it("states an empty packaging breakdown explicitly", () => {
    const html = render({ costs: { ...costs, presentations: [{ ...costs.presentations[0]!, packaging: [] }] } });

    expect(html).toContain("Sin packaging adicional");
  });

  it("does not turn an unavailable formatted amount into zero", () => {
    const html = render({ costs: { ...costs, unitCost: "not-a-money-value" } });

    expect(html).toContain("Importe no disponible");
  });

  it("generates a distinct heading id for each instance", () => {
    const html = renderToStaticMarkup(createElement("div", null,
      createElement(VariableCostsSummary, { productName: "Uno", costs }),
      createElement(VariableCostsSummary, { productName: "Dos", costs }),
    ));
    const ids = [...html.matchAll(/<h2 id="([^"]+)"/g)].map((match) => match[1]);

    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("allows long presentation names to wrap in the explanation", () => {
    expect(render()).toContain('<h4 class="min-w-0 break-words font-semibold text-fg">');
  });
});
