import { Fraction } from "./fraction";

// Pure variable-cost engine for phase 2. Adapters at the persistence boundary
// map supply, recipe and presentation rows to these value objects; this module
// never imports React, Drizzle or server code.
//
// Monetary values and quantities are decimal strings. Values remain exact
// rational fractions throughout the calculation and are rounded only when
// returned for display or persistence, with ROUND_HALF_UP to two decimals.

const MONEY_DECIMALS = 2;

type UnitFamily = "count" | "mass" | "volume";

type NormalizedUnit = {
  family: UnitFamily;
  factor: Fraction;
};

const UNITS: Record<string, NormalizedUnit> = {
  unidad: { family: "count", factor: Fraction.fromDecimal("1")! },
  unidades: { family: "count", factor: Fraction.fromDecimal("1")! },
  ud: { family: "count", factor: Fraction.fromDecimal("1")! },
  uds: { family: "count", factor: Fraction.fromDecimal("1")! },
  g: { family: "mass", factor: Fraction.fromDecimal("1")! },
  gr: { family: "mass", factor: Fraction.fromDecimal("1")! },
  kg: { family: "mass", factor: Fraction.fromDecimal("1000")! },
  ml: { family: "volume", factor: Fraction.fromDecimal("1")! },
  l: { family: "volume", factor: Fraction.fromDecimal("1000")! },
};

export type SupplyPurchase = {
  id: string;
  purchasePrice: string;
  purchaseQuantity: string;
  purchaseUnit: string;
};

export type SupplyUsage = {
  supplyId: string;
  quantity: string;
  unit: string;
};

export type ProductRecipe = {
  yieldQuantity: string;
  ingredients: SupplyUsage[];
};

export type CommercialPresentation = {
  id: string;
  name: string;
  unitsPerPresentation: string;
  packaging?: SupplyUsage[];
};

export type VariableCostsInput = {
  supplies: SupplyPurchase[];
  recipe: ProductRecipe;
  presentations: CommercialPresentation[];
};

export type VariableCostsErrorCode =
  | "EMPTY_RECIPE"
  | "INVALID_RECIPE_YIELD"
  | "INVALID_PURCHASE_PRICE"
  | "INVALID_PURCHASE_QUANTITY"
  | "INVALID_USAGE_QUANTITY"
  | "INVALID_PRESENTATION_UNITS"
  | "INVALID_SUPPLY_ID"
  | "DUPLICATE_SUPPLY_ID"
  | "MISSING_SUPPLY"
  | "UNSUPPORTED_UNIT"
  | "INCOMPATIBLE_UNIT"
  | "INVALID_PRESENTATION_ID"
  | "DUPLICATE_PRESENTATION_ID"
  | "INVALID_PRESENTATION_NAME";

export type VariableCostsFailure = {
  ok: false;
  code: VariableCostsErrorCode;
  details?: { supplyId?: string; presentationId?: string; unit?: string };
};

export type PresentationVariableCost = {
  id: string;
  name: string;
  unitsPerPresentation: string;
  productCost: string;
  packagingCost: string;
  // Reconciles rounded packaging lines with their rounded exact subtotal.
  packagingItemsAdjustment: string;
  // Reconciles rounded product and packaging subtotals with the rounded total.
  roundingAdjustment: string;
  totalCost: string;
  packaging: PackagingVariableCost[];
};

export type PackagingVariableCost = {
  supplyId: string;
  quantity: string;
  unit: string;
  cost: string;
};

export type VariableCostsSuccess = {
  ok: true;
  ingredientsCost: string;
  recipeYield: string;
  unitCost: string;
  // Exact rational value used to calculate presentation product costs. It is
  // not a money amount and is intentionally not rounded to two decimals.
  unitCostCalculationValue: string;
  presentations: PresentationVariableCost[];
};

export type VariableCostsResult = VariableCostsSuccess | VariableCostsFailure;

function failure(
  code: VariableCostsErrorCode,
  details?: VariableCostsFailure["details"],
): VariableCostsFailure {
  return details === undefined ? { ok: false, code } : { ok: false, code, details };
}

function positiveDecimal(raw: string): Fraction | undefined {
  const value = Fraction.fromDecimal(raw);
  return value?.isPositive() ? value : undefined;
}

function nonNegativeDecimal(raw: string): Fraction | undefined {
  const value = Fraction.fromDecimal(raw);
  return value?.isNonNegative() ? value : undefined;
}

function normalizedUnit(raw: string): NormalizedUnit | undefined {
  return UNITS[raw.trim().toLowerCase()];
}

function normalizedId(raw: string): string {
  return raw.trim();
}

function money(value: Fraction): string {
  return value.toFixed(MONEY_DECIMALS);
}

function validateUsage(
  usage: SupplyUsage,
  supplies: Map<string, { price: Fraction; quantity: Fraction; unit: NormalizedUnit }>,
): Fraction | VariableCostsFailure {
  const supplyId = normalizedId(usage.supplyId);
  const quantity = positiveDecimal(usage.quantity);
  if (quantity === undefined) {
    return failure("INVALID_USAGE_QUANTITY", { supplyId });
  }

  const supply = supplies.get(supplyId);
  if (supply === undefined) {
    return failure("MISSING_SUPPLY", { supplyId });
  }

  const unit = normalizedUnit(usage.unit);
  if (unit === undefined) {
    return failure("UNSUPPORTED_UNIT", { supplyId, unit: usage.unit });
  }

  if (unit.family !== supply.unit.family) {
    return failure("INCOMPATIBLE_UNIT", { supplyId });
  }

  // Price is normalized to the base unit of each family: unit, gram or ml.
  // Multiply before dividing: for example 653.54 × 375 ÷ 492 is exactly
  // 498.125. Dividing first turns it into a repeating decimal approximation
  // which may otherwise cross a ROUND_HALF_UP half-cent boundary.
  return supply.price.multiply(quantity.multiply(unit.factor)).divide(supply.quantity.multiply(supply.unit.factor));
}

/**
 * Calculates the variable cost of one unit made from a recipe and of every
 * commercial presentation. Packaging is optional; an empty list contributes
 * zero. The function returns a failure value for incomplete or incompatible
 * domain data rather than displaying a plausible but incorrect amount.
 */
export function calculateVariableCosts(input: VariableCostsInput): VariableCostsResult {
  const yieldQuantity = positiveDecimal(input.recipe.yieldQuantity);
  if (yieldQuantity === undefined) return failure("INVALID_RECIPE_YIELD");

  if (input.recipe.ingredients.length === 0) return failure("EMPTY_RECIPE");

  const supplies = new Map<string, { price: Fraction; quantity: Fraction; unit: NormalizedUnit }>();
  for (const supply of input.supplies) {
    const supplyId = normalizedId(supply.id);
    if (supplyId === "") return failure("INVALID_SUPPLY_ID");
    if (supplies.has(supplyId)) return failure("DUPLICATE_SUPPLY_ID", { supplyId });

    const price = nonNegativeDecimal(supply.purchasePrice);
    if (price === undefined) return failure("INVALID_PURCHASE_PRICE", { supplyId });

    const quantity = positiveDecimal(supply.purchaseQuantity);
    if (quantity === undefined) return failure("INVALID_PURCHASE_QUANTITY", { supplyId });

    const unit = normalizedUnit(supply.purchaseUnit);
    if (unit === undefined) return failure("UNSUPPORTED_UNIT", { supplyId, unit: supply.purchaseUnit });

    supplies.set(supplyId, { price, quantity, unit });
  }

  let ingredientsCost = Fraction.zero();
  for (const ingredient of input.recipe.ingredients) {
    const cost = validateUsage(ingredient, supplies);
    if ("ok" in cost) return cost;
    ingredientsCost = ingredientsCost.add(cost);
  }

  // This value explains the calculation, but it is never multiplied again:
  // presentation product cost multiplies before dividing by the recipe yield.
  // With 1 / 3 x 18 this preserves 6 before rounding instead of carrying a
  // repeating-decimal approximation into the final total.
  const unitCostCalculationValue = ingredientsCost.divide(yieldQuantity);
  const presentationIds = new Set<string>();
  const presentations: PresentationVariableCost[] = [];

  for (const presentation of input.presentations) {
    const presentationId = normalizedId(presentation.id);
    if (presentationId === "") return failure("INVALID_PRESENTATION_ID");
    if (presentationIds.has(presentationId)) {
      return failure("DUPLICATE_PRESENTATION_ID", { presentationId });
    }
    if (presentation.name.trim() === "") {
      return failure("INVALID_PRESENTATION_NAME", { presentationId });
    }

    const units = positiveDecimal(presentation.unitsPerPresentation);
    if (units === undefined || !units.isInteger()) {
      return failure("INVALID_PRESENTATION_UNITS", { presentationId });
    }

    let packagingCost = Fraction.zero();
    let roundedPackagingItemsCost = Fraction.zero();
    const packagingBreakdown: PackagingVariableCost[] = [];
    for (const packaging of presentation.packaging ?? []) {
      const cost = validateUsage(packaging, supplies);
      if ("ok" in cost) return cost;
      packagingCost = packagingCost.add(cost);
      packagingBreakdown.push({
        supplyId: normalizedId(packaging.supplyId),
        quantity: positiveDecimal(packaging.quantity)!.toRatioString(),
        unit: packaging.unit.trim(),
        cost: money(cost),
      });
      roundedPackagingItemsCost = roundedPackagingItemsCost.add(Fraction.fromDecimal(money(cost))!);
    }

    // Postpone recipe-yield division until after presentation units. Fraction
    // keeps both this division and all packaging divisions exact.
    const productCost = ingredientsCost.multiply(units).divide(yieldQuantity);
    const totalCost = productCost.add(packagingCost);
    const roundedProductCost = money(productCost);
    const roundedPackagingCost = money(packagingCost);
    const roundedTotalCost = money(totalCost);
    const packagingItemsAdjustmentValue = Fraction.fromDecimal(roundedPackagingCost)!
      .subtract(roundedPackagingItemsCost);
    const roundingAdjustmentValue = Fraction.fromDecimal(roundedTotalCost)!
      .subtract(Fraction.fromDecimal(roundedProductCost)!)
      .subtract(Fraction.fromDecimal(roundedPackagingCost)!);
    presentations.push({
      id: presentationId,
      name: presentation.name.trim(),
      unitsPerPresentation: units.toRatioString(),
      productCost: roundedProductCost,
      packagingCost: roundedPackagingCost,
      packagingItemsAdjustment: money(packagingItemsAdjustmentValue),
      roundingAdjustment: money(roundingAdjustmentValue),
      totalCost: roundedTotalCost,
      packaging: packagingBreakdown,
    });
    presentationIds.add(presentationId);
  }

  return {
    ok: true,
    ingredientsCost: money(ingredientsCost),
    recipeYield: yieldQuantity.toRatioString(),
    unitCost: money(unitCostCalculationValue),
    unitCostCalculationValue: unitCostCalculationValue.toRatioString(),
    presentations,
  };
}
