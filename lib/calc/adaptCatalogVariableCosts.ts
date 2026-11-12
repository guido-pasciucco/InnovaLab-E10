import { type CommercialPresentation, type SupplyPurchase, type SupplyUsage, type VariableCostsInput } from "./calculateVariableCosts";
import { Fraction } from "./fraction";

// Pure boundary between the persisted catalog and the variable-cost engine.
// It keeps catalog decimals as exact fractions until it has a finite canonical
// decimal for the engine. It deliberately does not import Drizzle or a table
// type: the future persistence layer maps its rows to these DTOs.

export type CatalogSupplyKind = "supply" | "packaging";

export type CatalogSupply = {
  id: string;
  kind: CatalogSupplyKind;
  purchasePrice: string;
  purchaseQuantity: string;
  purchaseUnit: string;
  minimumUnit: string;
  conversionFactor: string;
};

export type CatalogRecipe = {
  yieldQuantity: string;
  ingredients: SupplyUsage[];
};

export type CatalogPresentation = CommercialPresentation;

export type CatalogVariableCostsSource = {
  catalog: CatalogSupply[];
  recipe: CatalogRecipe;
  presentations: CatalogPresentation[];
};

export type CatalogVariableCostsAdapterErrorCode =
  | "INVALID_CATALOG_SUPPLY_ID"
  | "DUPLICATE_CATALOG_SUPPLY_ID"
  | "INVALID_CATALOG_KIND"
  | "INVALID_PURCHASE_PRICE"
  | "INVALID_PURCHASE_QUANTITY"
  | "INVALID_CONVERSION_FACTOR"
  | "UNSUPPORTED_MINIMUM_UNIT"
  | "INCOMPATIBLE_PURCHASE_UNIT"
  | "MISSING_INGREDIENT_SUPPLY"
  | "INGREDIENT_MUST_BE_SUPPLY"
  | "MISSING_PACKAGING_SUPPLY"
  | "PACKAGING_MUST_BE_PACKAGING";

export type CatalogVariableCostsAdapterFailure = {
  ok: false;
  code: CatalogVariableCostsAdapterErrorCode;
  details?: { supplyId?: string; unit?: string };
};

export type CatalogVariableCostsAdapterSuccess = {
  ok: true;
  input: VariableCostsInput;
};

export type CatalogVariableCostsAdapterResult =
  | CatalogVariableCostsAdapterFailure
  | CatalogVariableCostsAdapterSuccess;

type UnitFamily = "count" | "mass" | "volume";

const CATALOG_UNITS: Record<string, { family: UnitFamily; canonical: string }> = {
  unidad: { family: "count", canonical: "unidad" },
  unidades: { family: "count", canonical: "unidad" },
  ud: { family: "count", canonical: "unidad" },
  uds: { family: "count", canonical: "unidad" },
  docena: { family: "count", canonical: "unidad" },
  docenas: { family: "count", canonical: "unidad" },
  g: { family: "mass", canonical: "g" },
  gr: { family: "mass", canonical: "g" },
  kg: { family: "mass", canonical: "g" },
  ml: { family: "volume", canonical: "ml" },
  l: { family: "volume", canonical: "ml" },
};

function failure(
  code: CatalogVariableCostsAdapterErrorCode,
  details?: CatalogVariableCostsAdapterFailure["details"],
): CatalogVariableCostsAdapterFailure {
  return details === undefined ? { ok: false, code } : { ok: false, code, details };
}

function normalizedId(raw: string): string {
  return raw.trim();
}

function normalizedUnit(raw: string): { family: UnitFamily; canonical: string } | undefined {
  return CATALOG_UNITS[raw.trim().toLowerCase()];
}

function positiveDecimal(raw: string): Fraction | undefined {
  const value = Fraction.fromDecimal(raw);
  return value?.isPositive() ? value : undefined;
}

// `purchaseQuantity` and `conversionFactor` start as finite decimal strings.
// Their product is therefore a finite decimal too. Convert its exact Fraction
// without Number or a decimal approximation before passing it to the engine.
function finiteDecimal(value: Fraction): string {
  let denominator = value.denominator;
  let twos = 0;
  let fives = 0;

  while (denominator % BigInt(2) === BigInt(0)) {
    denominator /= BigInt(2);
    twos += 1;
  }
  while (denominator % BigInt(5) === BigInt(0)) {
    denominator /= BigInt(5);
    fives += 1;
  }
  if (denominator !== BigInt(1)) {
    throw new RangeError("Catalog quantity conversion must produce a finite decimal.");
  }

  const decimalPlaces = Math.max(twos, fives);
  const numerator = value.numerator
    * BigInt(2) ** BigInt(decimalPlaces - twos)
    * BigInt(5) ** BigInt(decimalPlaces - fives);
  const sign = numerator < BigInt(0) ? "-" : "";
  const digits = (numerator < BigInt(0) ? -numerator : numerator)
    .toString()
    .padStart(decimalPlaces + 1, "0");

  if (decimalPlaces === 0) return `${sign}${digits}`;
  const split = digits.length - decimalPlaces;
  return `${sign}${digits.slice(0, split)}.${digits.slice(split)}`;
}

function adaptPurchase(supply: CatalogSupply): SupplyPurchase | CatalogVariableCostsAdapterFailure {
  const id = normalizedId(supply.id);
  if (id === "") return failure("INVALID_CATALOG_SUPPLY_ID");
  if (supply.kind !== "supply" && supply.kind !== "packaging") {
    return failure("INVALID_CATALOG_KIND", { supplyId: id });
  }

  const price = Fraction.fromDecimal(supply.purchasePrice);
  if (price === undefined || !price.isNonNegative()) {
    return failure("INVALID_PURCHASE_PRICE", { supplyId: id });
  }
  const quantity = positiveDecimal(supply.purchaseQuantity);
  if (quantity === undefined) return failure("INVALID_PURCHASE_QUANTITY", { supplyId: id });
  const factor = positiveDecimal(supply.conversionFactor);
  if (factor === undefined) return failure("INVALID_CONVERSION_FACTOR", { supplyId: id });

  const minimumUnit = normalizedUnit(supply.minimumUnit);
  if (minimumUnit === undefined) {
    return failure("UNSUPPORTED_MINIMUM_UNIT", { supplyId: id, unit: supply.minimumUnit });
  }

  // A recognized purchase unit cannot cross a physical family. An unknown
  // purchase label (for example "caja") is allowed only because its explicit
  // conversion factor maps it to a recognized minimum unit.
  const purchaseUnit = normalizedUnit(supply.purchaseUnit);
  if (purchaseUnit !== undefined && purchaseUnit.family !== minimumUnit.family) {
    return failure("INCOMPATIBLE_PURCHASE_UNIT", { supplyId: id, unit: supply.purchaseUnit });
  }

  return {
    id,
    purchasePrice: supply.purchasePrice,
    purchaseQuantity: finiteDecimal(quantity.multiply(factor)),
    purchaseUnit: minimumUnit.canonical,
  };
}

/**
 * Converts catalog DTOs to the engine contract without rounding. Packaging
 * remains attached only to its commercial presentation; this adapter never
 * promotes it into the recipe.
 */
export function adaptCatalogVariableCosts(
  source: CatalogVariableCostsSource,
): CatalogVariableCostsAdapterResult {
  const catalog = new Map<string, CatalogSupply>();
  const supplies: SupplyPurchase[] = [];

  for (const supply of source.catalog) {
    const adapted = adaptPurchase(supply);
    if ("ok" in adapted) return adapted;
    if (catalog.has(adapted.id)) {
      return failure("DUPLICATE_CATALOG_SUPPLY_ID", { supplyId: adapted.id });
    }
    catalog.set(adapted.id, supply);
    supplies.push(adapted);
  }

  for (const ingredient of source.recipe.ingredients) {
    const id = normalizedId(ingredient.supplyId);
    const supply = catalog.get(id);
    if (supply === undefined) return failure("MISSING_INGREDIENT_SUPPLY", { supplyId: id });
    if (supply.kind !== "supply") return failure("INGREDIENT_MUST_BE_SUPPLY", { supplyId: id });
  }

  for (const presentation of source.presentations) {
    for (const packaging of presentation.packaging ?? []) {
      const id = normalizedId(packaging.supplyId);
      const supply = catalog.get(id);
      if (supply === undefined) return failure("MISSING_PACKAGING_SUPPLY", { supplyId: id });
      if (supply.kind !== "packaging") return failure("PACKAGING_MUST_BE_PACKAGING", { supplyId: id });
    }
  }

  return {
    ok: true,
    input: {
      supplies,
      recipe: source.recipe,
      presentations: source.presentations,
    },
  };
}
