import Decimal from "decimal.js";

// Pure supply-cost formulas: the purchase is expressed in a minimum unit, and
// the cost engine consumes the price of that unit.
//
//   25 kg × 1000 = 25.000 g        (calculateMinimumUnits)
//   $18.750 / 25.000 g = $0,75/g   (calculateMinimumUnitPrice)
//
// Both return `null` instead of throwing when an input is not a finite,
// positive decimal: the form shows a live preview while the user types, so
// partial values are expected. Money and quantities are decimal strings, never
// floats (AGENTS.md, rule 3). Results keep 4 decimals, the same scale as the
// quantity columns.

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

function minimumUnitsValue(
  purchaseQuantity: string,
  conversionFactor: string,
): Decimal | null {
  const quantity = parse(purchaseQuantity);
  const factor = parse(conversionFactor);

  if (!quantity || !factor || quantity.lte(0) || factor.lte(0)) {
    return null;
  }

  return quantity.times(factor);
}

export function calculateMinimumUnits(
  purchaseQuantity: string,
  conversionFactor: string,
): string | null {
  const units = minimumUnitsValue(purchaseQuantity, conversionFactor);
  return units ? units.toFixed(DECIMALS, ROUNDING) : null;
}

export function calculateMinimumUnitPrice(
  purchasePrice: string,
  purchaseQuantity: string,
  conversionFactor: string,
): string | null {
  const price = parse(purchasePrice);
  const units = minimumUnitsValue(purchaseQuantity, conversionFactor);

  if (!price || price.lt(0) || !units) {
    return null;
  }

  return price.dividedBy(units).toFixed(DECIMALS, ROUNDING);
}
