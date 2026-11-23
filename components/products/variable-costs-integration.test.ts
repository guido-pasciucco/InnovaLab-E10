import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  adaptCatalogVariableCosts,
  type CatalogVariableCostsSource,
} from "@/lib/calc/adaptCatalogVariableCosts";
import { calculateVariableCosts } from "@/lib/calc/calculateVariableCosts";

import { VariableCostsSummary } from "./variable-costs-summary";

const source: CatalogVariableCostsSource = {
  catalog: [
    {
      id: "flour",
      kind: "supply",
      purchasePrice: "12.00",
      purchaseQuantity: "2",
      purchaseUnit: "kg",
      minimumUnit: "g",
      conversionFactor: "1000",
    },
    {
      id: "sugar",
      kind: "supply",
      purchasePrice: "6.00",
      purchaseQuantity: "1000",
      purchaseUnit: "g",
      minimumUnit: "g",
      conversionFactor: "1",
    },
    {
      id: "box",
      kind: "packaging",
      purchasePrice: "1.00",
      purchaseQuantity: "200",
      purchaseUnit: "unidad",
      minimumUnit: "unidad",
      conversionFactor: "1",
    },
  ],
  recipe: {
    yieldQuantity: "3",
    ingredients: [
      { supplyId: "flour", quantity: "500", unit: "g" },
      { supplyId: "sugar", quantity: "250", unit: "g" },
    ],
  },
  presentations: [
    { id: "single", name: "Individual", unitsPerPresentation: "1" },
    {
      id: "box-3",
      name: "Caja x3",
      unitsPerPresentation: "3",
      packaging: [{ supplyId: "box", quantity: "1", unit: "unidad" }],
    },
  ],
};

function calculate(input: CatalogVariableCostsSource) {
  const adapted = adaptCatalogVariableCosts(input);
  if (!adapted.ok) throw new Error(`Adapter failed: ${adapted.code}`);

  const result = calculateVariableCosts(adapted.input);
  if (!result.ok) throw new Error(`Engine failed: ${result.code}`);

  return result;
}

describe("variable-costs catalog integration", () => {
  it("flows catalog DTOs through the adapter and engine, then renders the authoritative result", () => {
    const result = calculate(source);
    const html = renderToStaticMarkup(
      createElement(VariableCostsSummary, {
        productName: "Alfajor",
        costs: result,
        supplyNames: { box: "Caja individual" },
      }),
    );

    expect(result.ingredientsCost).toBe("4.50");
    expect(result.unitCost).toBe("1.50");
    expect(result.presentations).toMatchObject([
      { id: "single", totalCost: "1.50" },
      { id: "box-3", productCost: "4.50", packagingCost: "0.01", totalCost: "4.51" },
    ]);
    expect(html).toContain("Costo de elaborar una unidad");
    expect(html).toContain("Caja x3");
    expect(html).toContain("$ 4,51");
    expect(html).toContain("Caja individual");
  });

  it("preserves a recurring unit cost as an exact JSON-safe fraction instead of rebuilding from $0.33", () => {
    const result = calculate({
      ...source,
      catalog: [{ ...source.catalog[0]!, purchasePrice: "1", purchaseQuantity: "1", purchaseUnit: "unidad", minimumUnit: "unidad", conversionFactor: "1" }],
      recipe: { yieldQuantity: "3", ingredients: [{ supplyId: "flour", quantity: "1", unit: "unidad" }] },
      presentations: [{ id: "box-3", name: "Caja x3", unitsPerPresentation: "3" }],
    });

    const recovered = JSON.parse(JSON.stringify(result)) as typeof result;
    const exactUnit = recovered.exact.unitCost;

    expect(recovered.unitCost).toBe("0.33");
    expect(recovered.presentations[0]?.totalCost).toBe("1.00");
    expect(exactUnit).toEqual({ numerator: "1", denominator: "3" });
    expect(BigInt(exactUnit.numerator) * BigInt(3)).toBe(BigInt(exactUnit.denominator));
  });

  it("recalculates every affected presentation from changed source prices", () => {
    const before = calculate(source);
    const after = calculate({
      ...source,
      catalog: source.catalog.map((supply) =>
        supply.id === "flour" ? { ...supply, purchasePrice: "24.00" } : supply,
      ),
    });

    expect(before.unitCost).toBe("1.50");
    expect(after.unitCost).toBe("2.50");
    expect(before.presentations.map((presentation) => presentation.totalCost)).toEqual(["1.50", "4.51"]);
    expect(after.presentations.map((presentation) => presentation.totalCost)).toEqual(["2.50", "7.51"]);
  });

  it.each([
    ["positive packaging-items adjustment", "0.004", "0.01"],
    ["negative packaging-items adjustment", "0.005", "-0.01"],
    ["zero packaging-items adjustment", "0.01", "0.00"],
  ])("keeps %s reconciled from exact packaging values", (_name, price, adjustment) => {
    const result = calculate({
      ...source,
      catalog: [
        { ...source.catalog[0]!, purchasePrice: "10", purchaseQuantity: "1", purchaseUnit: "unidad", minimumUnit: "unidad", conversionFactor: "1" },
        { ...source.catalog[2]!, id: "box-a", purchasePrice: price, purchaseQuantity: "1" },
        { ...source.catalog[2]!, id: "box-b", purchasePrice: price, purchaseQuantity: "1" },
      ],
      recipe: { yieldQuantity: "1", ingredients: [{ supplyId: "flour", quantity: "1", unit: "unidad" }] },
      presentations: [{
        id: "pack",
        name: "Pack",
        unitsPerPresentation: "1",
        packaging: [
          { supplyId: "box-a", quantity: "1", unit: "unidad" },
          { supplyId: "box-b", quantity: "1", unit: "unidad" },
        ],
      }],
    });

    const presentation = result.presentations[0]!;
    expect(presentation.packagingItemsAdjustment).toBe(adjustment);
    const visiblePackagingItems = presentation.packaging.reduce(
      (total, item) => total + BigInt(item.cost.replace(".", "")),
      BigInt(0),
    );
    const packagingSubtotal = BigInt(presentation.packagingCost.replace(".", ""));
    const packagingAdjustment = BigInt(presentation.packagingItemsAdjustment.replace(".", ""));
    expect(visiblePackagingItems + packagingAdjustment).toBe(packagingSubtotal);
  });

  it.each([
    ["missing catalog reference", { ...source, recipe: { ...source.recipe, ingredients: [{ supplyId: "missing", quantity: "1", unit: "g" }] } }, "MISSING_INGREDIENT_SUPPLY"],
    ["packaging used as ingredient", { ...source, recipe: { ...source.recipe, ingredients: [{ supplyId: "box", quantity: "1", unit: "unidad" }] } }, "INGREDIENT_MUST_BE_SUPPLY"],
    ["supply used as packaging", { ...source, presentations: [{ id: "bad", name: "Bad", unitsPerPresentation: "1", packaging: [{ supplyId: "flour", quantity: "1", unit: "g" }] }] }, "PACKAGING_MUST_BE_PACKAGING"],
  ] satisfies Array<[string, CatalogVariableCostsSource, string]>)("rejects %s at the adapter boundary", (_name, input, code) => {
    expect(adaptCatalogVariableCosts(input)).toMatchObject({ ok: false, code });
  });

  it.each([
    ["incompatible unit", { ...source, recipe: { ...source.recipe, ingredients: [{ supplyId: "flour", quantity: "1", unit: "ml" }] } }, "INCOMPATIBLE_UNIT"],
    ["invalid yield", { ...source, recipe: { ...source.recipe, yieldQuantity: "0" } }, "INVALID_RECIPE_YIELD"],
    ["invalid quantity", { ...source, recipe: { ...source.recipe, ingredients: [{ supplyId: "flour", quantity: "0", unit: "g" }] } }, "INVALID_USAGE_QUANTITY"],
  ] satisfies Array<[string, CatalogVariableCostsSource, string]>)("does not convert %s into a successful result", (_name, input, code) => {
    const adapted = adaptCatalogVariableCosts(input);
    expect(adapted.ok).toBe(true);
    if (adapted.ok) expect(calculateVariableCosts(adapted.input)).toMatchObject({ ok: false, code });
  });
});
