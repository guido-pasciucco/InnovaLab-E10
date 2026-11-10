import { describe, expect, it } from "vitest";

import { calculateVariableCosts, type VariableCostsInput } from "./calculateVariableCosts";

const validInput: VariableCostsInput = {
  supplies: [
    { id: "flour", purchasePrice: "12000", purchaseQuantity: "12", purchaseUnit: "kg" },
    { id: "box", purchasePrice: "450", purchaseQuantity: "1", purchaseUnit: "unidad" },
    { id: "label", purchasePrice: "50", purchaseQuantity: "1", purchaseUnit: "unidad" },
  ],
  recipe: {
    yieldQuantity: "24",
    ingredients: [{ supplyId: "flour", quantity: "24", unit: "kg" }],
  },
  presentations: [
    {
      id: "box-6",
      name: "Caja x6",
      unitsPerPresentation: "6",
      packaging: [
        { supplyId: "box", quantity: "1", unit: "unidad" },
        { supplyId: "label", quantity: "1", unit: "unidad" },
      ],
    },
  ],
};

describe("calculateVariableCosts", () => {
  it("returns the unit and presentation costs from exact decimal inputs", () => {
    const result = calculateVariableCosts(validInput);

    expect(result).toEqual({
      ok: true,
      ingredientsCost: "24000.00",
      recipeYield: "24",
      unitCost: "1000.00",
      presentations: [
        {
          id: "box-6",
          name: "Caja x6",
          unitsPerPresentation: "6",
          productCost: "6000.00",
          packagingCost: "500.00",
          totalCost: "6500.00",
        },
      ],
    });
  });

  it("normalizes kilograms and grams before applying a supply price", () => {
    const result = calculateVariableCosts({
      ...validInput,
      recipe: { yieldQuantity: "10", ingredients: [{ supplyId: "flour", quantity: "250", unit: "g" }] },
      presentations: [],
    });

    expect(result).toMatchObject({ ok: true, ingredientsCost: "250.00", unitCost: "25.00" });
  });

  it("keeps full precision until a presentation total leaves the engine", () => {
    const result = calculateVariableCosts({
      supplies: [{ id: "ingredient", purchasePrice: "1", purchaseQuantity: "1", purchaseUnit: "unidad" }],
      recipe: { yieldQuantity: "3", ingredients: [{ supplyId: "ingredient", quantity: "1", unit: "unidad" }] },
      presentations: [{ id: "pack", name: "Pack x3", unitsPerPresentation: "3" }],
    });

    expect(result).toMatchObject({
      ok: true,
      unitCost: "0.33",
      presentations: [{ productCost: "1.00", packagingCost: "0.00", totalCost: "1.00" }],
    });
  });

  it("returns zero packaging cost when a product is sold without packaging", () => {
    const result = calculateVariableCosts({
      ...validInput,
      presentations: [{ id: "individual", name: "Individual", unitsPerPresentation: "1" }],
    });

    expect(result).toMatchObject({
      ok: true,
      presentations: [{ productCost: "1000.00", packagingCost: "0.00", totalCost: "1000.00" }],
    });
  });

  it("calculates every valid presentation of the same product", () => {
    const result = calculateVariableCosts({
      ...validInput,
      presentations: [
        { id: "individual", name: "Individual", unitsPerPresentation: "1" },
        validInput.presentations[0]!,
        { id: "pack-10", name: "Pack x10", unitsPerPresentation: "10" },
      ],
    });

    expect(result).toMatchObject({ ok: true, presentations: [{ id: "individual" }, { id: "box-6" }, { id: "pack-10" }] });
  });

  const invalidCases: Array<[string, VariableCostsInput]> = [
    ["EMPTY_RECIPE", { ...validInput, recipe: { ...validInput.recipe, ingredients: [] } }],
    ["INVALID_RECIPE_YIELD", { ...validInput, recipe: { ...validInput.recipe, yieldQuantity: "0" } }],
    ["INVALID_USAGE_QUANTITY", { ...validInput, recipe: { ...validInput.recipe, ingredients: [{ supplyId: "flour", quantity: "-1", unit: "kg" }] } }],
    ["MISSING_SUPPLY", { ...validInput, recipe: { ...validInput.recipe, ingredients: [{ supplyId: "missing", quantity: "1", unit: "unidad" }] } }],
    ["INCOMPATIBLE_UNIT", { ...validInput, recipe: { ...validInput.recipe, ingredients: [{ supplyId: "flour", quantity: "1", unit: "ml" }] } }],
    ["INVALID_PRESENTATION_UNITS", { ...validInput, presentations: [{ id: "bad", name: "Bad", unitsPerPresentation: "1.5" }] }],
  ];

  it.each(invalidCases)("returns %s when required domain data is invalid", (code, input) => {
    expect(calculateVariableCosts(input)).toMatchObject({ ok: false, code });
  });
});
