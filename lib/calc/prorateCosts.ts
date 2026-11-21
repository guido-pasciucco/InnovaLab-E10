import Decimal from "decimal.js";

// Pure prorrateo of the period indirect costs over the catalog products
// (issue #244). The period lines are the indirect costs of the month (rental,
// services, and so on); the products carry the monthly capacity that absorbs
// them and their variable unit cost, which comes from the recipe and excludes
// the indirects.
//
// The prorrateo is the simple capacity-based one agreed in the phase-2 flow
// docs: every cost is spread by the participation of each product (its
// capacity over the sum of the capacities) and the indirect cost per unit is
// the period total over that sum:
//
//   assigned_i = Σ amount_L × capacity_i / Σ capacity_j
//   indirect_i = assigned_i / capacity_i = Σ amount_L / Σ capacity_j
//   unit_i     = variableUnit_i + indirect_i        (#244: costo total unitario)
//
// For a single product the spread over lines collapses to the period total, so
// the engine returns the same unit cost the cost totals compute for one volume.
//
// Money stays a Decimal until it leaves the function. Each returned amount is
// rounded once, from full precision, with ROUND_HALF_UP to 2 decimals. Rounding
// the share before adding it to the variable cost is what drifts a cent away
// from the spreadsheet.

const FINAL_MONEY_DECIMALS = 2;
const FINAL_MONEY_ROUNDING = Decimal.ROUND_HALF_UP;

export type MoneyString = string;

export type ProrationCostLine = {
  id: string;
  // Indirect period cost of one line (alquiler, servicio, ...).
  amount: string;
};

export type ProrationProduct = {
  id: string;
  // Monthly capacity that absorbs the indirect costs. Must be a positive
  // integer: a product that is not going to be produced cannot absorb an
  // indirect cost this month.
  capacity: number;
  // Variable unit cost of the product recipe, indirects excluded.
  variableUnit: string;
};

export type ProratedCost = {
  productId: string;
  capacity: number;
  variableUnit: string;
  // Portion of the period indirect costs that one unit of the product absorbs.
  indirectUnit: string;
  // Total unit cost: variable + indirect. The #244 "costo total unitario".
  unitCost: string;
  // Indirect cost absorbed by the product for the period: assigned / capacity.
  fixedShare: string;
};

export type ProrationErrorCode = "INVALID_AMOUNT" | "INVALID_CAPACITY" | "NO_CAPACITY";

export type ProrationResult =
  | { ok: true; costs: readonly ProratedCost[] }
  | { ok: false; code: ProrationErrorCode };

function parseDecimal(raw: string): Decimal | undefined {
  try {
    const value = new Decimal(raw);
    return value.isFinite() ? value : undefined;
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
 * - Los importes deben ser montos válidos: `INVALID_AMOUNT`.
 */
export function calculateProration(input: {
  lines: readonly ProrationCostLine[];
  products: readonly ProrationProduct[];
}): ProrationResult {
  if (input.products.length === 0) {
    return { ok: false, code: "NO_CAPACITY" };
  }

  let capacitySum = 0;
  for (const product of input.products) {
    if (!Number.isInteger(product.capacity) || product.capacity <= 0) {
      return { ok: false, code: "INVALID_CAPACITY" };
    }
    capacitySum += product.capacity;
  }

  let totalFixed = new Decimal(0);
  for (const line of input.lines) {
    const amount = parseDecimal(line.amount);
    if (amount === undefined) {
      return { ok: false, code: "INVALID_AMOUNT" };
    }
    totalFixed = totalFixed.plus(amount);
  }

  const costs: ProratedCost[] = [];
  for (const product of input.products) {
    const variableUnit = parseDecimal(product.variableUnit);
    if (variableUnit === undefined) {
      return { ok: false, code: "INVALID_AMOUNT" };
    }

    const capacity = new Decimal(product.capacity);
    // Assigned share of the period total to this product, then the per-unit
    // portion it absorbs. The variable cost is added on top, never absorbed.
    const assigned = totalFixed.times(capacity).div(new Decimal(capacitySum));
    const indirect = assigned.div(capacity);

    costs.push({
      productId: product.id,
      capacity: product.capacity,
      variableUnit: product.variableUnit,
      indirectUnit: asMoney(indirect),
      unitCost: asMoney(variableUnit.plus(indirect)),
      fixedShare: asMoney(assigned),
    });
  }

  return { ok: true, costs };
}
