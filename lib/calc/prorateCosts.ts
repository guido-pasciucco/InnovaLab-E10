import Decimal from "decimal.js";

// Pure prorrateo of the period indirect costs over the catalog products
// (issue #244). The period lines are the indirect costs of the month (rental,
// services, and so on); the products carry the monthly capacity that absorbs
// them and, when it is available, their variable unit cost, which comes from
// the recipe and excludes the indirects.
//
// The prorrateo is the simple capacity-based one agreed in the phase-2 flow
// docs and confirmed by the DATA spreadsheet (#250): the participation of a
// product is its capacity over the sum of the capacities, and the indirect
// cost per unit is the period total over that sum:
//
//   share_i    = capacity_i / Σ capacity_j
//   assigned_i = Σ amount_L × share_i
//   indirect_i = assigned_i / capacity_i = Σ amount_L / Σ capacity_j
//   unit_i     = variableUnit_i + indirect_i        (#244: costo total unitario)
//
// Money stays a Decimal until it leaves the function. Each returned amount is
// rounded once, from full precision, with ROUND_HALF_UP to 2 decimals. Rounding
// the share before adding it to the variable cost is what drifts a cent away
// from the spreadsheet.

const FINAL_MONEY_DECIMALS = 2;
const FINAL_MONEY_ROUNDING = Decimal.ROUND_HALF_UP;
const SHARE_DECIMALS = 4;

export type MoneyString = string;

export type ProrationCostLine = {
  id: string;
  // Indirect period cost of one line (alquiler, servicio, ...). Never negative.
  amount: string;
};

export type ProrationProduct = {
  id: string;
  // Monthly capacity that absorbs the indirect costs. Must be a positive
  // integer: a product that is not going to be produced cannot absorb an
  // indirect cost this month.
  capacity: number;
  // Variable unit cost of the product recipe, indirects excluded. `null` when
  // the recipe cannot be costed yet: the product still absorbs its indirect
  // share, but it has no total unit cost (never a misleading 0).
  variableUnit: string | null;
};

export type ProratedCost = {
  productId: string;
  capacity: number;
  // Participation of the product: capacity over the sum of capacities, as a
  // ratio with 4 decimals ("0.9000" is 90 %). Display only.
  share: string;
  variableUnit: MoneyString | null;
  // Portion of the period indirect costs that one unit of the product absorbs.
  indirectUnit: MoneyString;
  // Total unit cost: variable + indirect. The #244 "costo total unitario".
  // `null` when the variable cost is not available.
  unitCost: MoneyString | null;
  // Indirect cost absorbed by the product for the whole period.
  fixedShare: MoneyString;
};

export type ProrationErrorCode = "INVALID_AMOUNT" | "INVALID_CAPACITY" | "NO_CAPACITY";

export type ProrationResult =
  | { ok: true; costs: readonly ProratedCost[] }
  | { ok: false; code: ProrationErrorCode };

function parseNonNegative(raw: string): Decimal | undefined {
  try {
    const value = new Decimal(raw);
    return value.isFinite() && !value.isNegative() ? value : undefined;
  } catch {
    return undefined;
  }
}

function asMoney(value: Decimal): MoneyString {
  return value.toFixed(FINAL_MONEY_DECIMALS, FINAL_MONEY_ROUNDING);
}

/**
 * Prorratea los costos indirectos del período entre los productos del catálogo
 * según su capacidad mensual y devuelve el costo total unitario de cada uno.
 *
 * - Sin productos no hay con qué prorratear: `NO_CAPACITY`.
 * - La capacidad debe ser un entero positivo: `INVALID_CAPACITY`.
 * - Los importes (gastos y costo variable) deben ser montos no negativos:
 *   `INVALID_AMOUNT`.
 */
export function calculateProration(input: {
  lines: readonly ProrationCostLine[];
  products: readonly ProrationProduct[];
}): ProrationResult {
  if (input.products.length === 0) {
    return { ok: false, code: "NO_CAPACITY" };
  }

  let capacitySum = new Decimal(0);
  for (const product of input.products) {
    if (!Number.isSafeInteger(product.capacity) || product.capacity <= 0) {
      return { ok: false, code: "INVALID_CAPACITY" };
    }
    capacitySum = capacitySum.plus(product.capacity);
  }

  let totalFixed = new Decimal(0);
  for (const line of input.lines) {
    const amount = parseNonNegative(line.amount);
    if (amount === undefined) {
      return { ok: false, code: "INVALID_AMOUNT" };
    }
    totalFixed = totalFixed.plus(amount);
  }

  const indirectPerUnit = totalFixed.div(capacitySum);

  const costs: ProratedCost[] = [];
  for (const product of input.products) {
    const capacity = new Decimal(product.capacity);

    let variableUnit: Decimal | null = null;
    if (product.variableUnit !== null) {
      const parsed = parseNonNegative(product.variableUnit);
      if (parsed === undefined) {
        return { ok: false, code: "INVALID_AMOUNT" };
      }
      variableUnit = parsed;
    }

    costs.push({
      productId: product.id,
      capacity: product.capacity,
      share: capacity.div(capacitySum).toFixed(SHARE_DECIMALS, FINAL_MONEY_ROUNDING),
      variableUnit: variableUnit === null ? null : asMoney(variableUnit),
      indirectUnit: asMoney(indirectPerUnit),
      // The variable cost is added on top, never absorbed.
      unitCost: variableUnit === null ? null : asMoney(variableUnit.plus(indirectPerUnit)),
      fixedShare: asMoney(totalFixed.times(capacity).div(capacitySum)),
    });
  }

  return { ok: true, costs };
}
