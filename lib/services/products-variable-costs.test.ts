import { describe, expect, it } from "vitest";

import type { CatalogSupply } from "@/lib/calc/adaptCatalogVariableCosts";
import { deriveProductVariableCosts } from "./products";

const supply: CatalogSupply = {
  id: "flour",
  kind: "supply",
  purchasePrice: "1",
  purchaseQuantity: "1",
  purchaseUnit: "unidad",
  minimumUnit: "unidad",
  conversionFactor: "1",
};

const recipe = {
  yieldQuantity: "1",
  recipe: [{ supplyId: "flour", supplyName: "Harina", quantity: "1", unit: "g" }],
};

function catalogSupply(
  id: string,
  purchaseUnit: string,
  minimumUnit: string,
  conversionFactor: string,
): CatalogSupply {
  return {
    ...supply,
    id,
    purchaseUnit,
    minimumUnit,
    conversionFactor,
  };
}

describe("deriveProductVariableCosts", () => {
  it("returns an exact calculable result for a valid product, including a real zero cost", () => {
    const result = deriveProductVariableCosts(recipe, [{ ...supply, purchasePrice: "0" }]);

    expect(result).toMatchObject({
      variableCosts: { ingredientsCost: "0.00", unitCost: "0.00" },
      variableCostsUnavailableCode: null,
    });
  });

  it("keeps historical products without yield distinct from zero cost", () => {
    expect(deriveProductVariableCosts({ ...recipe, yieldQuantity: null }, [supply])).toEqual({
      variableCosts: null,
      variableCostsUnavailableCode: null,
    });
  });

  it("returns a typed unavailable state for known incompatible catalog data", () => {
    expect(
      deriveProductVariableCosts(recipe, [{ ...supply, minimumUnit: "legacy-unit" }]),
    ).toEqual({
      variableCosts: null,
      variableCostsUnavailableCode: "UNSUPPORTED_MINIMUM_UNIT",
    });
  });

  it("does not omit a missing ingredient from a mixed recipe", () => {
    expect(
      deriveProductVariableCosts(
        {
          ...recipe,
          recipe: [
            ...recipe.recipe,
            { supplyId: "missing", supplyName: "No existe", quantity: "1", unit: "g" },
          ],
        },
        [supply],
      ),
    ).toEqual({
      variableCosts: null,
      variableCostsUnavailableCode: "MISSING_INGREDIENT_SUPPLY",
    });
  });
  it("calculates unaffected products when another product has incompatible data", () => {
    const valid = deriveProductVariableCosts(recipe, [supply]);
    const incompatible = deriveProductVariableCosts(recipe, [
      { ...supply, minimumUnit: "legacy-unit" },
    ]);

    expect(valid.variableCosts?.unitCost).toBe("1.00");
    expect(incompatible.variableCostsUnavailableCode).toBe("UNSUPPORTED_MINIMUM_UNIT");
  });

  it("ignores an unrelated incompatible catalog row", () => {
    expect(
      deriveProductVariableCosts(recipe, [
        supply,
        { ...supply, id: "legacy", minimumUnit: "legacy-unit" },
      ]),
    ).toMatchObject({
      variableCosts: { unitCost: "1.00" },
      variableCostsUnavailableCode: null,
    });
  });

  it.each([
    ["mass", catalogSupply("mass", "kg", "g", "1000"), "kg", "0.5", "0.50"],
    ["volume", catalogSupply("volume", "L", "ml", "1000"), "L", "0.5", "0.50"],
    ["length", catalogSupply("length", "m", "mm", "1000"), "cm", "50", "0.50"],
    ["count", catalogSupply("count", "docena", "unidad", "12"), "docena", "0.5", "0.50"],
  ])(
    "uses the persisted %s recipe unit and converts it exactly to the catalog minimum unit",
    (_family, catalogEntry, unit, quantity, expected) => {
      const result = deriveProductVariableCosts(
        {
          yieldQuantity: "1",
          recipe: [
            {
              supplyId: catalogEntry.id,
              supplyName: "Insumo",
              quantity,
              unit,
            },
          ],
        },
        [catalogEntry],
      );

      expect(result).toMatchObject({
        variableCosts: { ingredientsCost: expected, unitCost: expected },
        variableCostsUnavailableCode: null,
      });
    },
  );
  it("propagates unexpected malformed catalog values", () => {
    expect(() =>
      deriveProductVariableCosts(recipe, [{ ...supply, purchasePrice: null as unknown as string }]),
    ).toThrow(TypeError);
  });
});
