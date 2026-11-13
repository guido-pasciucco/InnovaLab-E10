import { describe, expect, it } from "vitest";

import { adaptCatalogVariableCosts } from "@/lib/calc/adaptCatalogVariableCosts";
import { calculateVariableCosts } from "@/lib/calc/calculateVariableCosts";

import { recipeYieldSchema } from "./recipe-yield";

const validYield = { yieldQuantity: "1" };

function calculateWithYield(yieldQuantity: string) {
  const adapted = adaptCatalogVariableCosts({
    catalog: [{
      id: "ingredient",
      kind: "supply",
      purchasePrice: "6000",
      purchaseQuantity: "1",
      purchaseUnit: "unidad",
      minimumUnit: "unidad",
      conversionFactor: "1",
    }],
    recipe: {
      yieldQuantity,
      ingredients: [{ supplyId: "ingredient", quantity: "1", unit: "unidad" }],
    },
    presentations: [{ id: "three", name: "Tres unidades", unitsPerPresentation: "3" }],
  });

  if (!adapted.ok) throw new Error(adapted.code);
  const result = calculateVariableCosts(adapted.input);
  if (!result.ok) throw new Error(result.code);
  return result;
}

describe("recipeYieldSchema", () => {
  it.each([
    ["", "Indicá cuántas unidades obtenés con esta receta."],
    ["0", "El rendimiento debe ser mayor que 0."],
    ["-1", "El rendimiento debe ser mayor que 0."],
    ["1.5", "El rendimiento debe ser un número entero."],
    ["uno", "El rendimiento debe ser un número entero."],
    ["9007199254740992", "El rendimiento supera el máximo permitido."],
  ])("rejects %j with the public message", (yieldQuantity, message) => {
    const result = recipeYieldSchema.safeParse({ yieldQuantity });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe(message);
  });

  it("accepts a positive integer and returns its explicit string representation", () => {
    expect(recipeYieldSchema.parse(validYield)).toEqual(validYield);
    expect(recipeYieldSchema.parse({ yieldQuantity: "24" })).toEqual({ yieldQuantity: "24" });
  });

  it("passes yield 1 to the real engine without changing the recipe cost", () => {
    const result = calculateWithYield(recipeYieldSchema.parse(validYield).yieldQuantity);

    expect(result.unitCost).toBe("6000.00");
  });

  it("passes yield 24 to the real engine as an exact divisor", () => {
    const result = calculateWithYield(recipeYieldSchema.parse({ yieldQuantity: "24" }).yieldQuantity);

    expect(result.unitCost).toBe("250.00");
  });

  it("preserves a recurring yield through the real engine instead of using rounded money", () => {
    const adapted = adaptCatalogVariableCosts({
      catalog: [{
        id: "ingredient",
        kind: "supply",
        purchasePrice: "1",
        purchaseQuantity: "1",
        purchaseUnit: "unidad",
        minimumUnit: "unidad",
        conversionFactor: "1",
      }],
      recipe: {
        yieldQuantity: recipeYieldSchema.parse({ yieldQuantity: "3" }).yieldQuantity,
        ingredients: [{ supplyId: "ingredient", quantity: "1", unit: "unidad" }],
      },
      presentations: [{ id: "three", name: "Tres unidades", unitsPerPresentation: "3" }],
    });

    expect(adapted.ok).toBe(true);
    if (!adapted.ok) return;

    const result = calculateVariableCosts(adapted.input);
    expect(result).toMatchObject({
      ok: true,
      unitCost: "0.33",
      exact: { unitCost: { numerator: "1", denominator: "3" } },
      presentations: [{ totalCost: "1.00" }],
    });
  });
});
