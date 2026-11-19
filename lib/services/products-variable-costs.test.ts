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
  recipe: [{ supplyId: "flour", supplyName: "Harina", quantity: "1" }],
};

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

  it("calculates unaffected products when another product has incompatible data", () => {
    const valid = deriveProductVariableCosts(recipe, [supply]);
    const incompatible = deriveProductVariableCosts(recipe, [
      { ...supply, minimumUnit: "legacy-unit" },
    ]);

    expect(valid.variableCosts?.unitCost).toBe("1.00");
    expect(incompatible.variableCostsUnavailableCode).toBe("UNSUPPORTED_MINIMUM_UNIT");
  });

  it("propagates unexpected malformed catalog values", () => {
    expect(() =>
      deriveProductVariableCosts(recipe, [{ ...supply, purchasePrice: null as unknown as string }]),
    ).toThrow(TypeError);
  });
});
