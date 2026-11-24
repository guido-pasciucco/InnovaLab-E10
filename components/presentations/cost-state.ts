import type { ProductItem } from "@/lib/schemas/products/products";

// P12 states (#298). The view never shows a $0 cost as if it were valid: when
// the engine cannot calculate, it explains why instead of rendering amounts.
export type CostState =
  | { kind: "ready" }
  | { kind: "incomplete-recipe" | "invalid-yield" | "unavailable"; message: string };

export function describeCostState(
  product: Pick<ProductItem, "recipe" | "variableCosts" | "variableCostsUnavailableCode">,
): CostState {
  if (product.variableCosts) return { kind: "ready" };

  if (product.recipe.length === 0 || product.variableCostsUnavailableCode === "EMPTY_RECIPE") {
    return {
      kind: "incomplete-recipe",
      message: "La receta está incompleta: agregale insumos para calcular el costo.",
    };
  }

  const code = product.variableCostsUnavailableCode;
  if (code === "MISSING_YIELD" || code === "INVALID_RECIPE_YIELD") {
    return {
      kind: "invalid-yield",
      message: "El rendimiento de la receta no es válido: corregilo en el producto.",
    };
  }

  return {
    kind: "unavailable",
    message: "No se puede calcular el costo variable con los datos actuales.",
  };
}
