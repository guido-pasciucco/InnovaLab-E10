import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VariableCostsSummary } from "./variable-costs-summary";

const costs = {
  ok: true as const,
  ingredientsCost: "1.00",
  recipeYield: "1",
  unitCost: "1.00",
  unitCostCalculationValue: "1e-7",
  presentations: [
    {
      id: "individual",
      name: "Presentación con un nombre muy largo para comprobar el ajuste móvil",
      unitsPerPresentation: "1",
      productCost: "0.01",
      packagingCost: "0.01",
      roundingAdjustment: "-0.01",
      totalCost: "0.01",
      packaging: [{ supplyId: "7c12dafa-0101-4bde-9ee0-91ed4b2db4b8", quantity: "1", unit: "unidad", cost: "0.01" }],
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

    expect(html).toContain("Ajuste de redondeo");
    expect(html).toContain("$ -0,01");
    expect(html).toContain("Costo variable final");
  });

  it("uses readable calculation precision, singular units and no raw supply identifier", () => {
    const html = render();

    expect(html).toContain("$ 0,0000001");
    expect(html).not.toContain("1e-7");
    expect(html).toContain("1 unidad elaborada");
    expect(html).toContain("Insumo de packaging");
    expect(html).not.toContain("7c12dafa-0101-4bde-9ee0-91ed4b2db4b8");
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

  it("generates a distinct heading id for each instance", () => {
    const html = renderToStaticMarkup(createElement("div", null,
      createElement(VariableCostsSummary, { productName: "Uno", costs }),
      createElement(VariableCostsSummary, { productName: "Dos", costs }),
    ));
    const ids = [...html.matchAll(/<h2 id="([^"]+)"/g)].map((match) => match[1]);

    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });
});
