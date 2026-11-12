import { describe, expect, it } from "vitest";

import { calculateVariableCosts } from "./calculateVariableCosts";
import { adaptCatalogVariableCosts, type CatalogVariableCostsSource } from "./adaptCatalogVariableCosts";

const validSource: CatalogVariableCostsSource = {
  catalog: [
    {
      id: "flour",
      kind: "supply",
      purchasePrice: "18750.00",
      purchaseQuantity: "25",
      purchaseUnit: "kg",
      minimumUnit: "g",
      conversionFactor: "1000",
    },
    {
      id: "box",
      kind: "packaging",
      purchasePrice: "100",
      purchaseQuantity: "1",
      purchaseUnit: "unidad",
      minimumUnit: "unidad",
      conversionFactor: "1",
    },
  ],
  recipe: {
    yieldQuantity: "24",
    ingredients: [{ supplyId: "flour", quantity: "500", unit: "g" }],
  },
  presentations: [
    {
      id: "box-6",
      name: "Caja x6",
      unitsPerPresentation: "6",
      packaging: [{ supplyId: "box", quantity: "1", unit: "unidad" }],
    },
  ],
};

function adapted(source: CatalogVariableCostsSource = validSource) {
  const result = adaptCatalogVariableCosts(source);
  expect(result).toMatchObject({ ok: true });
  if (!result.ok) throw new Error("Expected successful catalog adaptation.");
  return result.input;
}

describe("adaptCatalogVariableCosts", () => {
  it("converts kg to exact grams without changing the purchase price", () => {
    const input = adapted();

    expect(input.supplies[0]).toEqual({
      id: "flour",
      purchasePrice: "18750.00",
      purchaseQuantity: "25000",
      purchaseUnit: "g",
    });
  });

  it("converts litres to exact millilitres", () => {
    const input = adapted({
      ...validSource,
      catalog: [{
        id: "milk",
        kind: "supply",
        purchasePrice: "3000",
        purchaseQuantity: "2",
        purchaseUnit: "L",
        minimumUnit: "ml",
        conversionFactor: "1000",
      }],
      recipe: { yieldQuantity: "1", ingredients: [{ supplyId: "milk", quantity: "250", unit: "ml" }] },
      presentations: [{ id: "single", name: "Individual", unitsPerPresentation: "1" }],
    });

    expect(input.supplies[0]).toMatchObject({ purchaseQuantity: "2000", purchaseUnit: "ml" });
  });

  it("converts dozens to exact units", () => {
    const input = adapted({
      ...validSource,
      catalog: [{
        id: "eggs",
        kind: "supply",
        purchasePrice: "2400",
        purchaseQuantity: "1",
        purchaseUnit: "docena",
        minimumUnit: "unidad",
        conversionFactor: "12",
      }],
      recipe: { yieldQuantity: "1", ingredients: [{ supplyId: "eggs", quantity: "1", unit: "unidad" }] },
      presentations: [{ id: "single", name: "Individual", unitsPerPresentation: "1" }],
    });

    expect(input.supplies[0]).toMatchObject({ purchaseQuantity: "12", purchaseUnit: "unidad" });
  });

  it("accepts a custom package label only with an explicit canonical equivalence", () => {
    const input = adapted({
      ...validSource,
      catalog: [{
        id: "labels",
        kind: "packaging",
        purchasePrice: "10",
        purchaseQuantity: "2.5",
        purchaseUnit: "rollo",
        minimumUnit: "unidad",
        conversionFactor: "100",
      }],
      recipe: { yieldQuantity: "1", ingredients: [] },
      presentations: [{
        id: "single",
        name: "Individual",
        unitsPerPresentation: "1",
        packaging: [{ supplyId: "labels", quantity: "0.5", unit: "unidad" }],
      }],
    });

    expect(input.supplies[0]).toMatchObject({ purchaseQuantity: "250", purchaseUnit: "unidad" });
  });

  it("keeps periodic divisions exact: one currency unit yields three units and x3 costs one", () => {
    const input = adapted({
      catalog: [{
        id: "ingredient",
        kind: "supply",
        purchasePrice: "1",
        purchaseQuantity: "1",
        purchaseUnit: "unidad",
        minimumUnit: "unidad",
        conversionFactor: "1",
      }],
      recipe: { yieldQuantity: "3", ingredients: [{ supplyId: "ingredient", quantity: "1", unit: "unidad" }] },
      presentations: [{ id: "three", name: "Tres unidades", unitsPerPresentation: "3" }],
    });
    const result = calculateVariableCosts(input);

    expect(result).toMatchObject({ ok: true, unitCost: "0.33" });
    if (result.ok) expect(result.presentations[0]?.totalCost).toBe("1.00");
  });

  it("rejects packaging as a recipe ingredient", () => {
    const result = adaptCatalogVariableCosts({
      ...validSource,
      recipe: { ...validSource.recipe, ingredients: [{ supplyId: "box", quantity: "1", unit: "unidad" }] },
    });

    expect(result).toEqual({ ok: false, code: "INGREDIENT_MUST_BE_SUPPLY", details: { supplyId: "box" } });
  });

  it("rejects a supply as commercial packaging", () => {
    const result = adaptCatalogVariableCosts({
      ...validSource,
      presentations: [{
        ...validSource.presentations[0]!,
        packaging: [{ supplyId: "flour", quantity: "1", unit: "g" }],
      }],
    });

    expect(result).toEqual({ ok: false, code: "PACKAGING_MUST_BE_PACKAGING", details: { supplyId: "flour" } });
  });

  it.each([
    ["kg", "ml", "INCOMPATIBLE_PURCHASE_UNIT"],
    ["caja", "paquete", "UNSUPPORTED_MINIMUM_UNIT"],
  ] as const)("rejects incompatible or ambiguous units: %s to %s", (purchaseUnit, minimumUnit, code) => {
    const result = adaptCatalogVariableCosts({
      ...validSource,
      catalog: [{ ...validSource.catalog[0]!, purchaseUnit, minimumUnit }],
    });

    expect(result).toMatchObject({ ok: false, code });
  });

  it.each([
    ["purchaseQuantity", "0", "INVALID_PURCHASE_QUANTITY"],
    ["purchaseQuantity", "-1", "INVALID_PURCHASE_QUANTITY"],
    ["conversionFactor", "0", "INVALID_CONVERSION_FACTOR"],
    ["conversionFactor", "-1", "INVALID_CONVERSION_FACTOR"],
  ] as const)("rejects invalid catalog %s %s", (field, value, code) => {
    const result = adaptCatalogVariableCosts({
      ...validSource,
      catalog: [{ ...validSource.catalog[0]!, [field]: value }],
    });

    expect(result).toMatchObject({ ok: false, code });
  });

  it.each(["0", "-1"])("leaves invalid recipe usage %s for the engine to reject", (quantity) => {
    const result = calculateVariableCosts(adapted({
      ...validSource,
      recipe: {
        ...validSource.recipe,
        ingredients: [{ supplyId: "flour", quantity, unit: "g" }],
      },
    }));

    expect(result).toMatchObject({ ok: false, code: "INVALID_USAGE_QUANTITY" });
  });
});
