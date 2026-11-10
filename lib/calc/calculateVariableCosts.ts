import Decimal from "decimal.js";

// Pure variable-cost engine for phase 2. Adapters at the persistence boundary
// map supply, recipe and presentation rows to these value objects; this module
// never imports React, Drizzle or server code.
//
// Monetary values and quantities are decimal strings. Values remain Decimal
// throughout the calculation and are rounded only when returned for display or
// persistence, with ROUND_HALF_UP to two decimal places.

const MONEY_DECIMALS = 2;
const MONEY_ROUNDING = Decimal.ROUND_HALF_UP;

type UnitFamily = "count" | "mass" | "volume";

type NormalizedUnit = {
  family: UnitFamily;
  factor: Decimal;
};

const UNITS: Record<string, NormalizedUnit> = {
  unidad: { family: "count", factor: new Decimal(1) },
  unidades: { family: "count", factor: new Decimal(1) },
  ud: { family: "count", factor: new Decimal(1) },
  uds: { family: "count", factor: new Decimal(1) },
  g: { family: "mass", factor: new Decimal(1) },
  gr: { family: "mass", factor: new Decimal(1) },
  kg: { family: "mass", factor: new Decimal(1000) },
  ml: { family: "volume", factor: new Decimal(1) },
  l: { family: "volume", factor: new Decimal(1000) },
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
  // Decimal.js value used to calculate presentation product costs. It is not
  // rounded to money decimals, so UI can explain a total without implying the
  // displayed unit amount was multiplied after rounding.
  unitCostExact: string;
  presentations: PresentationVariableCost[];
};

export type VariableCostsResult = VariableCostsSuccess | VariableCostsFailure;

function failure(
  code: VariableCostsErrorCode,
  details?: VariableCostsFailure["details"],
): VariableCostsFailure {
  return details === undefined ? { ok: false, code } : { ok: false, code, details };
}

function positiveDecimal(raw: string): Decimal | undefined {
  try {
    const value = new Decimal(raw.trim());
    return value.isFinite() && value.gt(0) ? value : undefined;
  } catch {
    return undefined;
  }
}

function nonNegativeDecimal(raw: string): Decimal | undefined {
  try {
    const value = new Decimal(raw.trim());
    return value.isFinite() && value.gte(0) ? value : undefined;
  } catch {
    return undefined;
  }
}

function normalizedUnit(raw: string): NormalizedUnit | undefined {
  return UNITS[raw.trim().toLowerCase()];
}

function normalizedId(raw: string): string {
  return raw.trim();
}

function money(value: Decimal): string {
  return value.toFixed(MONEY_DECIMALS, MONEY_ROUNDING);
}

function validateUsage(
  usage: SupplyUsage,
  supplies: Map<string, { price: Decimal; quantity: Decimal; unit: NormalizedUnit }>,
): Decimal | VariableCostsFailure {
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
  return supply.price.div(supply.quantity.times(supply.unit.factor)).times(quantity.times(unit.factor));
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

  const supplies = new Map<string, { price: Decimal; quantity: Decimal; unit: NormalizedUnit }>();
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

  let ingredientsCost = new Decimal(0);
  for (const ingredient of input.recipe.ingredients) {
    const cost = validateUsage(ingredient, supplies);
    if ("ok" in cost) return cost;
    ingredientsCost = ingredientsCost.plus(cost);
  }

  // Keep this unrounded until each output leaves the engine. Multiplying a
  // displayed $0.33 unit cost by three would otherwise lose a cent.
  const exactUnitCost = ingredientsCost.div(yieldQuantity);
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

    let packagingCost = new Decimal(0);
    const packagingBreakdown: PackagingVariableCost[] = [];
    for (const packaging of presentation.packaging ?? []) {
      const cost = validateUsage(packaging, supplies);
      if ("ok" in cost) return cost;
      packagingCost = packagingCost.plus(cost);
      packagingBreakdown.push({
        supplyId: normalizedId(packaging.supplyId),
        quantity: positiveDecimal(packaging.quantity)!.toString(),
        unit: packaging.unit.trim(),
        cost: money(cost),
      });
    }

    const productCost = exactUnitCost.times(units);
    presentations.push({
      id: presentationId,
      name: presentation.name.trim(),
      unitsPerPresentation: units.toString(),
      productCost: money(productCost),
      packagingCost: money(packagingCost),
      totalCost: money(productCost.plus(packagingCost)),
      packaging: packagingBreakdown,
    });
    presentationIds.add(presentationId);
  }

  return {
    ok: true,
    ingredientsCost: money(ingredientsCost),
    recipeYield: yieldQuantity.toString(),
    unitCost: money(exactUnitCost),
    unitCostExact: exactUnitCost.toString(),
    presentations,
  };
}
