import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";

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
      unitCostCalculationValue: "1000",
      presentations: [
        {
          id: "box-6",
          name: "Caja x6",
          unitsPerPresentation: "6",
          productCost: "6000.00",
          packagingCost: "500.00",
          packagingItemsAdjustment: "0.00",
          roundingAdjustment: "0.00",
          totalCost: "6500.00",
          packaging: [
            { supplyId: "box", quantity: "1", unit: "unidad", cost: "450.00" },
            { supplyId: "label", quantity: "1", unit: "unidad", cost: "50.00" },
          ],
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

  it("normalizes litres and millilitres before applying a supply price", () => {
    const result = calculateVariableCosts({
      supplies: [{ id: "milk", purchasePrice: "3000", purchaseQuantity: "2", purchaseUnit: "l" }],
      recipe: { yieldQuantity: "10", ingredients: [{ supplyId: "milk", quantity: "250", unit: "ml" }] },
      presentations: [],
    });

    expect(result).toMatchObject({ ok: true, ingredientsCost: "375.00", unitCost: "37.50" });
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
      unitCostCalculationValue: "1/3",
      presentations: [{ productCost: "1.00", packagingCost: "0.00", packagingItemsAdjustment: "0.00", roundingAdjustment: "0.00", totalCost: "1.00" }],
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
        { id: "pack-4", name: "Pack x4", unitsPerPresentation: "4" },
        validInput.presentations[0]!,
        { id: "pack-12", name: "Pack x12", unitsPerPresentation: "12" },
      ],
    });

    expect(result).toMatchObject({ ok: true, presentations: [{ id: "individual" }, { id: "pack-4" }, { id: "box-6" }, { id: "pack-12" }] });
  });

  it("rounds returned money with ROUND_HALF_UP", () => {
    const result = calculateVariableCosts({
      supplies: [{ id: "ingredient", purchasePrice: "0.005", purchaseQuantity: "1", purchaseUnit: "unidad" }],
      recipe: { yieldQuantity: "1", ingredients: [{ supplyId: "ingredient", quantity: "1", unit: "unidad" }] },
      presentations: [],
    });

    expect(result).toMatchObject({ ok: true, ingredientsCost: "0.01", unitCost: "0.01" });
  });

  it.each([
    ["1/300 + 1/1200 + 1/1200", "300", "0.01"],
    ["1/3 + 1/1200 + 1/1200", "3", "0.34"],
  ])("adds exact recurring costs before rounding: %s", (_description, firstQuantity, expected) => {
    const result = calculateVariableCosts({
      supplies: [
        { id: "first", purchasePrice: "1", purchaseQuantity: firstQuantity, purchaseUnit: "unidad" },
        { id: "second", purchasePrice: "1", purchaseQuantity: "1200", purchaseUnit: "unidad" },
        { id: "third", purchasePrice: "1", purchaseQuantity: "1200", purchaseUnit: "unidad" },
      ],
      recipe: {
        yieldQuantity: "1",
        ingredients: [
          { supplyId: "first", quantity: "1", unit: "unidad" },
          { supplyId: "second", quantity: "1", unit: "unidad" },
          { supplyId: "third", quantity: "1", unit: "unidad" },
        ],
      },
      presentations: [{ id: "individual", name: "Individual", unitsPerPresentation: "1" }],
    });

    expect(result).toMatchObject({
      ok: true,
      ingredientsCost: expected,
      unitCost: expected,
      presentations: [{ productCost: expected, totalCost: expected }],
    });
  });

  it("preserves a recurring division until the final ROUND_HALF_UP total", () => {
    const result = calculateVariableCosts({
      supplies: [
        { id: "ingredient", purchasePrice: "1", purchaseQuantity: "1", purchaseUnit: "unidad" },
        { id: "package", purchasePrice: "1", purchaseQuantity: "200", purchaseUnit: "unidad" },
      ],
      recipe: { yieldQuantity: "3", ingredients: [{ supplyId: "ingredient", quantity: "1", unit: "unidad" }] },
      presentations: [{
        id: "pack-18",
        name: "Pack x18",
        unitsPerPresentation: "18",
        packaging: [{ supplyId: "package", quantity: "1", unit: "unidad" }],
      }],
    });

    expect(result).toMatchObject({
      ok: true,
      presentations: [{ productCost: "6.00", packagingCost: "0.01", packagingItemsAdjustment: "0.00", roundingAdjustment: "0.00", totalCost: "6.01" }],
    });
  });

  it("matches an independent high-precision oracle for recurring ingredients and packaging", () => {
    const oracleDecimal = Decimal.clone({ precision: 120, rounding: Decimal.ROUND_HALF_UP });
    const expected = new oracleDecimal("116.13")
      .times("21")
      .div("9")
      .plus("0.945")
      .toFixed(2, oracleDecimal.ROUND_HALF_UP);
    const result = calculateVariableCosts({
      supplies: [
        { id: "ingredient", purchasePrice: "116.13", purchaseQuantity: "1", purchaseUnit: "unidad" },
        { id: "package", purchasePrice: "0.945", purchaseQuantity: "1", purchaseUnit: "unidad" },
      ],
      recipe: { yieldQuantity: "9", ingredients: [{ supplyId: "ingredient", quantity: "1", unit: "unidad" }] },
      presentations: [{
        id: "pack-21",
        name: "Pack x21",
        unitsPerPresentation: "21",
        packaging: [{ supplyId: "package", quantity: "1", unit: "unidad" }],
      }],
    });

    expect(expected).toBe("271.92");
    expect(result).toMatchObject({ ok: true, presentations: [{ totalCost: expected }] });
  });

  it.each([
    ["653.54", "492", "375", "498.13"],
    ["4920.54", "164", "287", "8610.95"],
  ])("preserves an exact half-cent when purchase quantity is divided after usage: %s", (purchasePrice, purchaseQuantity, usageQuantity, expected) => {
    const result = calculateVariableCosts({
      supplies: [{ id: "ingredient", purchasePrice, purchaseQuantity, purchaseUnit: "unidad" }],
      recipe: { yieldQuantity: "1", ingredients: [{ supplyId: "ingredient", quantity: usageQuantity, unit: "unidad" }] },
      presentations: [{ id: "individual", name: "Individual", unitsPerPresentation: "1" }],
    });

    expect(result).toMatchObject({
      ok: true,
      ingredientsCost: expected,
      presentations: [{ productCost: expected, totalCost: expected }],
    });
  });

  it("reconciles individually rounded packaging with its exact subtotal and total", () => {
    const result = calculateVariableCosts({
      supplies: [
        { id: "ingredient", purchasePrice: "10", purchaseQuantity: "1", purchaseUnit: "unidad" },
        { id: "a", purchasePrice: "0.005", purchaseQuantity: "1", purchaseUnit: "unidad" },
        { id: "b", purchasePrice: "0.005", purchaseQuantity: "1", purchaseUnit: "unidad" },
      ],
      recipe: { yieldQuantity: "1", ingredients: [{ supplyId: "ingredient", quantity: "1", unit: "unidad" }] },
      presentations: [{
        id: "single",
        name: "Individual",
        unitsPerPresentation: "1",
        packaging: [
          { supplyId: "a", quantity: "1", unit: "unidad" },
          { supplyId: "b", quantity: "1", unit: "unidad" },
        ],
      }],
    });

    expect(result).toMatchObject({
      ok: true,
      presentations: [{
        productCost: "10.00",
        packagingCost: "0.01",
        packagingItemsAdjustment: "-0.01",
        roundingAdjustment: "0.00",
        totalCost: "10.01",
        packaging: [{ cost: "0.01" }, { cost: "0.01" }],
      }],
    });
  });

  it.each([
    ["positive packaging adjustment", "0.004", "0.004", "0.01", "0.01", "0.00", "0.01"],
    ["positive presentation adjustment", "0.004", "0.004", "0.00", "0.00", "0.01", "0.01"],
    ["negative presentation adjustment", "0.005", "0.005", "0.01", "0.00", "-0.01", "0.01"],
  ])("keeps rounded adjustments reconciled for %s", (_name, ingredientPrice, packagingPrice, expectedPackaging, expectedPackagingAdjustment, expectedTotalAdjustment, expectedTotal) => {
    const packaging = expectedPackagingAdjustment === "0.01"
      ? [
          { id: "a", purchasePrice: packagingPrice, purchaseQuantity: "1", purchaseUnit: "unidad" },
          { id: "b", purchasePrice: packagingPrice, purchaseQuantity: "1", purchaseUnit: "unidad" },
        ]
      : [{ id: "a", purchasePrice: packagingPrice, purchaseQuantity: "1", purchaseUnit: "unidad" }];
    const result = calculateVariableCosts({
      supplies: [{ id: "ingredient", purchasePrice: ingredientPrice, purchaseQuantity: "1", purchaseUnit: "unidad" }, ...packaging],
      recipe: { yieldQuantity: "1", ingredients: [{ supplyId: "ingredient", quantity: "1", unit: "unidad" }] },
      presentations: [{
        id: "individual",
        name: "Individual",
        unitsPerPresentation: "1",
        packaging: packaging.map(({ id }) => ({ supplyId: id, quantity: "1", unit: "unidad" })),
      }],
    });

    expect(result).toMatchObject({
      ok: true,
      presentations: [{
        packagingCost: expectedPackaging,
        packagingItemsAdjustment: expectedPackagingAdjustment,
        roundingAdjustment: expectedTotalAdjustment,
        totalCost: expectedTotal,
      }],
    });
  });

  it("keeps exact normalized ingredient and packaging values through nested calculations", () => {
    const result = calculateVariableCosts({
      supplies: [
        { id: "flour", purchasePrice: "12", purchaseQuantity: "1", purchaseUnit: "kg" },
        { id: "syrup", purchasePrice: "3", purchaseQuantity: "2", purchaseUnit: "l" },
        { id: "box", purchasePrice: "1", purchaseQuantity: "3", purchaseUnit: "unidad" },
        { id: "label", purchasePrice: "1", purchaseQuantity: "20", purchaseUnit: "unidad" },
      ],
      recipe: {
        yieldQuantity: "3",
        ingredients: [
          { supplyId: "flour", quantity: "250", unit: "g" },
          { supplyId: "syrup", quantity: "125", unit: "ml" },
        ],
      },
      presentations: [{
        id: "pack-2",
        name: "Pack x2",
        unitsPerPresentation: "2",
        packaging: [
          { supplyId: "box", quantity: "1", unit: "unidad" },
          { supplyId: "label", quantity: "2", unit: "unidad" },
        ],
      }],
    });

    expect(result).toMatchObject({
      ok: true,
      ingredientsCost: "3.19",
      presentations: [{ productCost: "2.13", packagingCost: "0.43", totalCost: "2.56" }],
    });
  });

  it("uses normalized identifiers without mutating the caller input", () => {
    const input: VariableCostsInput = {
      ...validInput,
      supplies: validInput.supplies.map((supply) => ({ ...supply })),
      recipe: {
        ...validInput.recipe,
        ingredients: [{ supplyId: " flour ", quantity: "24", unit: "kg" }],
      },
      presentations: [{ ...validInput.presentations[0]!, id: " box-6 ", packaging: [] }],
    };
    const before = structuredClone(input);

    const first = calculateVariableCosts(input);
    const second = calculateVariableCosts(input);

    expect(input).toEqual(before);
    expect(first).toEqual(second);
    expect(first).toMatchObject({ ok: true, presentations: [{ id: "box-6" }] });
  });

  const invalidCases: Array<[string, VariableCostsInput]> = [
    ["EMPTY_RECIPE", { ...validInput, recipe: { ...validInput.recipe, ingredients: [] } }],
    ["INVALID_RECIPE_YIELD", { ...validInput, recipe: { ...validInput.recipe, yieldQuantity: "0" } }],
    ["INVALID_PURCHASE_PRICE", { ...validInput, supplies: [{ ...validInput.supplies[0]!, purchasePrice: "-1" }] }],
    ["INVALID_PURCHASE_QUANTITY", { ...validInput, supplies: [{ ...validInput.supplies[0]!, purchaseQuantity: "0" }] }],
    ["INVALID_USAGE_QUANTITY", { ...validInput, recipe: { ...validInput.recipe, ingredients: [{ supplyId: "flour", quantity: "-1", unit: "kg" }] } }],
    ["INVALID_SUPPLY_ID", { ...validInput, supplies: [{ ...validInput.supplies[0]!, id: " " }] }],
    ["DUPLICATE_SUPPLY_ID", { ...validInput, supplies: [validInput.supplies[0]!, { ...validInput.supplies[1]!, id: " flour " }] }],
    ["MISSING_SUPPLY", { ...validInput, recipe: { ...validInput.recipe, ingredients: [{ supplyId: "missing", quantity: "1", unit: "unidad" }] } }],
    ["UNSUPPORTED_UNIT", { ...validInput, supplies: [{ ...validInput.supplies[0]!, purchaseUnit: "tonelada" }] }],
    ["UNSUPPORTED_UNIT", { ...validInput, recipe: { ...validInput.recipe, ingredients: [{ supplyId: "flour", quantity: "1", unit: "tonelada" }] } }],
    ["INCOMPATIBLE_UNIT", { ...validInput, recipe: { ...validInput.recipe, ingredients: [{ supplyId: "flour", quantity: "1", unit: "ml" }] } }],
    ["INVALID_PRESENTATION_UNITS", { ...validInput, presentations: [{ id: "bad", name: "Bad", unitsPerPresentation: "0" }] }],
    ["INVALID_PRESENTATION_UNITS", { ...validInput, presentations: [{ id: "bad", name: "Bad", unitsPerPresentation: "-1" }] }],
    ["INVALID_PRESENTATION_UNITS", { ...validInput, presentations: [{ id: "bad", name: "Bad", unitsPerPresentation: "1.5" }] }],
    ["INVALID_PRESENTATION_ID", { ...validInput, presentations: [{ id: " ", name: "Bad", unitsPerPresentation: "1" }] }],
    ["DUPLICATE_PRESENTATION_ID", { ...validInput, presentations: [{ id: "pack", name: "One", unitsPerPresentation: "1" }, { id: " pack ", name: "Two", unitsPerPresentation: "2" }] }],
    ["INVALID_PRESENTATION_NAME", { ...validInput, presentations: [{ id: "bad", name: " ", unitsPerPresentation: "1" }] }],
  ];

  it.each(invalidCases)("returns %s when required domain data is invalid", (code, input) => {
    expect(calculateVariableCosts(input)).toMatchObject({ ok: false, code });
  });

  it("returns MISSING_SUPPLY when a packaging supply does not exist", () => {
    const result = calculateVariableCosts({
      ...validInput,
      presentations: [{
        id: "box-6",
        name: "Caja x6",
        unitsPerPresentation: "6",
        packaging: [{ supplyId: "missing", quantity: "1", unit: "unidad" }],
      }],
    });

    expect(result).toEqual({ ok: false, code: "MISSING_SUPPLY", details: { supplyId: "missing" } });
  });
});
