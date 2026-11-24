import { describe, expect, it } from "vitest";

import type { ProductItem } from "@/lib/schemas/products/products";
import { describeCostState } from "./cost-state";

const product = {
  id: "p1",
  name: "Alfajor",
  monthlyCapacity: null,
  yieldQuantity: "12",
  recipe: [{ supplyId: "s1", supplyName: "Harina", quantity: "250", unit: "g" }],
  variableCosts: null,
  variableCostsUnavailableCode: null,
} satisfies ProductItem;

describe("describeCostState", () => {
  it("is ready when the cost was calculated", () => {
    expect(
      describeCostState({ ...product, variableCosts: {} as ProductItem["variableCosts"] }),
    ).toEqual({ kind: "ready" });
  });

  it("reports an incomplete recipe when it has no ingredients", () => {
    expect(describeCostState({ ...product, recipe: [] })).toEqual({
      kind: "incomplete-recipe",
      message: "La receta está incompleta: agregale insumos para calcular el costo.",
    });
  });

  it.each(["MISSING_YIELD", "INVALID_RECIPE_YIELD"] as const)(
    "reports an invalid yield for %s",
    (code) => {
      expect(describeCostState({ ...product, variableCostsUnavailableCode: code })).toEqual({
        kind: "invalid-yield",
        message: "El rendimiento de la receta no es válido: corregilo en el producto.",
      });
    },
  );

  it("reports any other failure as calculation unavailable", () => {
    expect(
      describeCostState({ ...product, variableCostsUnavailableCode: "UNSUPPORTED_RECIPE_UNIT" }),
    ).toEqual({
      kind: "unavailable",
      message: "No se puede calcular el costo variable con los datos actuales.",
    });
  });
});
