import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { RecipeYieldField, recipeYieldLabel } from "./recipe-yield-field";

function render(overrides: Partial<React.ComponentProps<typeof RecipeYieldField>> = {}) {
  return renderToStaticMarkup(createElement(RecipeYieldField, {
    productName: "Alfajor de maicena",
    value: "1",
    onChange: vi.fn(),
    ...overrides,
  }));
}

describe("RecipeYieldField", () => {
  it("uses the current product name in the question", () => {
    expect(render()).toContain("¿Cuántas unidades de Alfajor de maicena obtenés con esta receta?");
  });

  it("uses the generic question without a product name", () => {
    expect(render({ productName: "" })).toContain("¿Cuántas unidades obtenés con esta receta?");
  });

  it("updates the label when the product name changes", () => {
    expect(recipeYieldLabel("Pizza napolitana")).toBe("¿Cuántas unidades de Pizza napolitana obtenés con esta receta?");
    expect(recipeYieldLabel("Remera estampada")).toBe("¿Cuántas unidades de Remera estampada obtenés con esta receta?");
  });

  it("normalizes whitespace for the label without changing the supplied name", () => {
    const name = "  Alfajor   de maicena  ";

    expect(recipeYieldLabel(name)).toBe("¿Cuántas unidades de Alfajor de maicena obtenés con esta receta?");
    expect(name).toBe("  Alfajor   de maicena  ");
  });

  it.each(["1", "24"])("renders the controlled yield value %s", (value) => {
    expect(render({ value })).toContain(`value="${value}"`);
  });

  it("connects label, help text and validation error accessibly", () => {
    const html = render({ id: "recipe-yield", error: "El rendimiento debe ser mayor que 0." });

    expect(html).toContain('<label for="recipe-yield"');
    expect(html).toContain('aria-describedby="recipe-yield-help recipe-yield-error"');
    expect(html).toContain('id="recipe-yield-help"');
    expect(html).toContain('id="recipe-yield-error" role="alert"');
  });

  it("supports disabled fields without removing their value", () => {
    const html = render({ disabled: true, value: "24" });

    expect(html).toContain("disabled");
    expect(html).toContain('value="24"');
  });
});
