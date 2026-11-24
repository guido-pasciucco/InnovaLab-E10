// Catalog of measurement units for supplies and packaging. The user picks one
// unit; the minimum unit and the conversion factor are derived from this table
// whenever they are needed and are never stored.

export const SUPPLY_UNIT_VALUES = [
  "g",
  "kg",
  "ml",
  "L",
  "mm",
  "cm",
  "m",
  "unidad",
  "par",
  "media docena",
  "docena",
] as const;

export type SupplyUnitValue = (typeof SUPPLY_UNIT_VALUES)[number];

export type SupplyUnitFamily = "mass" | "volume" | "length" | "count";

export type SupplyUnitDefinition = {
  value: SupplyUnitValue;
  label: string;
  family: SupplyUnitFamily;
  minimumUnit: string;
  factor: string;
};

export const SUPPLY_UNITS: readonly SupplyUnitDefinition[] = [
  { value: "g", label: "g (gramo)", family: "mass", minimumUnit: "g", factor: "1" },
  { value: "kg", label: "kg (kilogramo)", family: "mass", minimumUnit: "g", factor: "1000" },
  { value: "ml", label: "ml (mililitro)", family: "volume", minimumUnit: "ml", factor: "1" },
  { value: "L", label: "L (litro)", family: "volume", minimumUnit: "ml", factor: "1000" },
  { value: "mm", label: "mm (milímetro)", family: "length", minimumUnit: "mm", factor: "1" },
  { value: "cm", label: "cm (centímetro)", family: "length", minimumUnit: "mm", factor: "10" },
  { value: "m", label: "m (metro)", family: "length", minimumUnit: "mm", factor: "1000" },
  { value: "unidad", label: "unidad", family: "count", minimumUnit: "unidad", factor: "1" },
  { value: "par", label: "par", family: "count", minimumUnit: "unidad", factor: "2" },
  {
    value: "media docena",
    label: "media docena",
    family: "count",
    minimumUnit: "unidad",
    factor: "6",
  },
  { value: "docena", label: "docena", family: "count", minimumUnit: "unidad", factor: "12" },
];

function normalizeUnitKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Aliases accept common spellings (kilo, litros, docenas) for the same unit.
const UNIT_ALIASES: Record<string, SupplyUnitValue> = {
  g: "g",
  gr: "g",
  gramo: "g",
  gramos: "g",
  kg: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogramo: "kg",
  kilogramos: "kg",
  ml: "ml",
  mililitro: "ml",
  mililitros: "ml",
  l: "L",
  lt: "L",
  litro: "L",
  litros: "L",
  mm: "mm",
  milimetro: "mm",
  milimetros: "mm",
  cm: "cm",
  centimetro: "cm",
  centimetros: "cm",
  m: "m",
  metro: "m",
  metros: "m",
  unidad: "unidad",
  unidades: "unidad",
  ud: "unidad",
  uds: "unidad",
  u: "unidad",
  un: "unidad",
  par: "par",
  pares: "par",
  "media docena": "media docena",
  docena: "docena",
  docenas: "docena",
};

export function getSupplyUnit(value: string): SupplyUnitDefinition | null {
  const canonical = UNIT_ALIASES[normalizeUnitKey(value)];
  if (!canonical) return null;
  return SUPPLY_UNITS.find((unit) => unit.value === canonical) ?? null;
}

export function canonicalSupplyUnit(value: string): string {
  return getSupplyUnit(value)?.value ?? value.trim();
}

export function getSupplyUnitFamily(value: string): SupplyUnitFamily | null {
  return getSupplyUnit(value)?.family ?? null;
}

export function getSupplyUnitsForFamily(
  family: SupplyUnitFamily,
): readonly SupplyUnitDefinition[] {
  return SUPPLY_UNITS.filter((unit) => unit.family === family);
}

// Single source of truth for whether a recipe or packaging line's unit is valid
// for a supply: it must be a catalog unit of the supply's family. Used by both
// the forms and the services, so the two cannot diverge.
export function isRecipeUnitAllowed(family: SupplyUnitFamily | null, unit: string): boolean {
  const catalogUnit = getSupplyUnit(unit);
  return family !== null && catalogUnit !== null && catalogUnit.family === family;
}

export type SupplyUnitBasis = {
  minimumUnit: string;
  conversionFactor: string;
};

// The minimum unit and conversion factor of a purchase unit are never stored:
// they always come from this catalog (kg → g × 1000, docena → unidad × 12).
// A unit outside the catalog returns null and has no cost.
export function getSupplyUnitBasis(purchaseUnit: string): SupplyUnitBasis | null {
  const unit = getSupplyUnit(purchaseUnit);
  if (!unit) return null;

  return {
    minimumUnit: unit.minimumUnit,
    conversionFactor: unit.factor,
  };
}
