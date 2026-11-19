// Catalog of measurement units for supplies. The user picks one unit when
// creating a supply; the system derives the minimum unit and the conversion
// factor from this table. Packaging keeps its own free-text units for now.

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

// Aliases keep existing free-text rows usable while the catalog is rolled out.
const UNIT_ALIASES: Record<string, SupplyUnitValue> = {
  g: "g",
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

// A legacy supply may have a free-text purchase unit but a catalog minimum
// unit (for example, "bolsa" bought in g). The minimum unit is enough to infer
// the family; both unknown means the row predates the catalog entirely.
export function resolveSupplyFamily(
  purchaseUnit: string,
  minimumUnit: string,
): SupplyUnitFamily | null {
  return getSupplyUnitFamily(purchaseUnit) ?? getSupplyUnitFamily(minimumUnit);
}

export type SupplyUnits = {
  minimumUnit: string;
  conversionFactor: string;
};

export type SupplyUnitState = {
  kind: string;
  purchaseUnit: string;
  minimumUnit: string;
  conversionFactor: string;
};

export type ResolvedSupplyUnits = SupplyUnits & {
  purchaseUnit: string;
};

// Supplies derive their technical columns from the selected catalog unit.
// Packaging keeps whatever the user entered. A supply outside the catalog
// returns null: callers must decide whether it is a legacy row being preserved
// or a new/manipulated unit to reject.
export function resolveSupplyUnits(
  kind: string,
  purchaseUnit: string,
  fallback: SupplyUnits,
): SupplyUnits | null {
  if (kind !== "supply") return fallback;

  const unit = getSupplyUnit(purchaseUnit);
  if (!unit) return null;

  return {
    minimumUnit: unit.minimumUnit,
    conversionFactor: unit.factor,
  };
}

// Resolves an edit against the row that is actually stored. A legacy supply
// may keep a unit outside the catalog only when the payload repeats that same
// stored value; its technical columns come from the row, never from the
// payload. Any other unknown unit is rejected (null). Packaging keeps the
// existing free-text behaviour.
export function resolveSupplyUnitsForUpdate(
  existing: SupplyUnitState,
  input: SupplyUnitState,
): ResolvedSupplyUnits | null {
  if (input.kind !== "supply") {
    return {
      purchaseUnit: input.purchaseUnit,
      minimumUnit: input.minimumUnit,
      conversionFactor: input.conversionFactor,
    };
  }

  const unit = getSupplyUnit(input.purchaseUnit);
  if (unit) {
    return {
      purchaseUnit: unit.value,
      minimumUnit: unit.minimumUnit,
      conversionFactor: unit.factor,
    };
  }

  const keepsStoredLegacyUnit =
    existing.kind === "supply" &&
    input.purchaseUnit === existing.purchaseUnit;

  if (!keepsStoredLegacyUnit) return null;

  return {
    purchaseUnit: existing.purchaseUnit,
    minimumUnit: existing.minimumUnit,
    conversionFactor: existing.conversionFactor,
  };
}
