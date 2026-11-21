import Decimal from "decimal.js";

import { getSupplyUnit } from "@/lib/schemas/supplies/units";

// Recipe lines store the unit the user chose (kg, L, docena...). The cost
// engine works in the supply's minimum unit (g, ml, unidad), so this pure
// helper converts inside the selected catalog family:
//
//   1.5 kg × 1000 = 1.500 g
//   2 docenas × 12 = 24 unidades
//
// It returns null for a missing unit, an invalid quantity, or a legacy unit
// outside the catalog. Family compatibility with the supply is validated at
// the service boundary before persisting the line.

const DECIMALS = 4;
const ROUNDING = Decimal.ROUND_HALF_UP;

function parse(raw: string): Decimal | null {
  try {
    const value = new Decimal(raw);
    return value.isFinite() ? value : null;
  } catch {
    return null;
  }
}

export function convertRecipeQuantityToMinimumUnits(
  quantity: string,
  unit: string,
): string | null {
  const definition = getSupplyUnit(unit);
  const value = parse(quantity);

  if (!definition || !value || value.lte(0)) {
    return null;
  }

  return value.times(definition.factor).toFixed(DECIMALS, ROUNDING);
}
