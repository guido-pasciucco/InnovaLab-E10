import { describe, expect, it } from "vitest";

import type { ProductItem } from "@/lib/schemas/products/products";

import { DEFAULT_RECIPE_YIELD, toProductFormDefaults } from "./product-form-defaults";

function product(overrides: Partial<ProductItem> = {}): ProductItem {
  return {
    id: "product-1",
    name: "Alfajor de maicena",
    monthlyCapacity: 120,
    yieldQuantity: "24",
    recipe: [{ supplyId: "supply-1", quantity: "500", unit: "g" }],
    ...overrides,
  } as ProductItem;
}

describe("toProductFormDefaults", () => {
  it("starts a new product with a recipe yield of 1", () => {
    expect(DEFAULT_RECIPE_YIELD).toBe("1");
    expect(toProductFormDefaults(null)).toEqual({
      name: "",
      monthlyCapacity: "",
      yieldQuantity: "1",
      recipe: [{ supplyId: "", quantity: "", unit: "" }],
    });
  });

  it("keeps the saved yield, capacity and recipe of an existing product", () => {
    expect(toProductFormDefaults(product())).toEqual({
      name: "Alfajor de maicena",
      monthlyCapacity: "120",
      yieldQuantity: "24",
      recipe: [{ supplyId: "supply-1", quantity: "500", unit: "g" }],
    });
  });

  it("leaves an existing product without saved yield or capacity empty", () => {
    const defaults = toProductFormDefaults(product({ yieldQuantity: null, monthlyCapacity: null }));

    expect(defaults.yieldQuantity).toBe("");
    expect(defaults.monthlyCapacity).toBe("");
  });
});
