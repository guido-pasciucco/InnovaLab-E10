import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { VariableCostsSuccess } from "@/lib/calc/calculateVariableCosts";
import { VariableCostResult } from "./variable-cost-result";

const costs: VariableCostsSuccess = {
  ok: true,
  ingredientsCost: "1753.50",
  recipeYield: "1",
  unitCost: "1753.50",
  unitCostCalculationValue: "1753.5/1",
  exact: {
    ingredientsCost: { numerator: "175350", denominator: "100" },
    unitCost: { numerator: "175350", denominator: "100" },
  },
  presentations: [],
};

function render(overrides: Partial<React.ComponentProps<typeof VariableCostResult>> = {}) {
  return renderToStaticMarkup(createElement(VariableCostResult, {
    costs,
    ...overrides,
  }));
}

describe("VariableCostResult", () => {
  it("marks the calculated amount as read-only and formats it", () => {
    const html = render();

    expect(html).toContain("Resultado calculado");
    expect(html).toContain("Solo lectura");
    expect(html).toContain("Costo variable por unidad");
    expect(html).toContain("$ 1.753,50");
    expect(html).toContain("Costo de ingredientes: $ 1.753,50");
  });

  it("labels the saved amount as stale while the form has unsaved edits", () => {
    const html = render({ stale: true });

    expect(html).toContain("Último resultado guardado");
    expect(html).toContain("Cambios sin guardar");
    expect(html).toContain(
      "Los cambios en ingredientes, cantidades o rendimiento se calculan al guardar.",
    );
    expect(html).not.toContain("Solo lectura");
    expect(html).toContain("$ 1.753,50");
  });

  it("explains the empty state of a new product without showing a zero", () => {
    const html = render({ costs: null, pending: true });

    expect(html).toContain("Se calculará cuando guardes la receta y el rendimiento.");
    expect(html).toContain("—");
    expect(html).not.toContain("$ 0,00");
  });

  it("explains why an existing recipe has no result", () => {
    const html = render({ costs: null, unavailableCode: "MISSING_YIELD" });

    expect(html).toContain(
      "No se puede calcular el costo variable con los datos actuales de la receta.",
    );
  });
});
