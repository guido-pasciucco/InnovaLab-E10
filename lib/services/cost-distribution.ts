import "server-only";
import type { VerifiedUserId } from "./auth";

import Decimal from "decimal.js";

import { calculateProration, type ProratedCost } from "@/lib/calc/prorateCosts";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import type { ListPeriodCostsOptions } from "@/lib/db/costs/validation";
import { AppError } from "@/lib/errors/app-error";
import type { ProductItem } from "@/lib/schemas/products/products";

import { listPeriodCostsService } from "./business-cost";
import { listSaleRowsService, type SaleRow } from "./sale-rows";

// Cost distribution of the catalog (#244): how much of the period indirect
// costs (#243) each product absorbs according to its monthly capacity (#242),
// and the total unit cost (variable + indirect) that results.
//
// It is a read model. Nothing is stored: every call derives the figures from
// the saved period expenses and the saved products, so an edit to any of them
// shows up on the next read (live recalculation, decision D4). Owner scoping
// comes for free from the two services it composes, which resolve the business
// from the VerifiedUserId.
//
// A product only absorbs expenses with a capacity > 0 (decision D9). Without
// any capacity there is nothing to prorate over and no total cost is shown;
// the same happens without period expenses. A product whose variable cost is
// not available still absorbs its share, but it has no total: the screen shows
// "No disponible" with a reason instead of a misleading 0.

export type CostDistributionStatus =
  // At least one product has its total unit cost.
  | "ready"
  // No product has a capacity > 0: there is nothing to prorate over.
  | "no_capacity"
  // The period has no expenses to spread.
  | "no_expenses"
  // Capacity and expenses exist, but no product has a variable cost yet.
  | "unavailable";

export type VariableCostUnavailableCode = ProductItem["variableCostsUnavailableCode"];

export type CostDistributionRow = {
  rowId: string;
  productId: string;
  presentationId: string | null;
  name: string;
  // The saved monthly capacity of the row, or null when it was never loaded.
  capacity: number | null;
  ownMarkupPercent: string | null;
  // Where the row's capacity is loaded: the product, or its presentations.
  editHref: string;
  // False when the product has no capacity > 0 and so is left out of the
  // prorrateo; every figure below that depends on the spread is then null.
  absorbsExpenses: boolean;
  // Capacity over the sum of capacities, as a ratio with 4 decimals.
  share: string | null;
  // Variable cost of one unit, or null while the recipe cannot be costed.
  variableUnit: string | null;
  // Why the variable cost is null: a code from the variable-cost engine, or
  // null when the product simply has no recipe yet.
  variableUnavailableCode: VariableCostUnavailableCode;
  // Indirect cost one unit absorbs.
  indirectUnit: string | null;
  // Indirect cost the product absorbs for the whole period.
  fixedShare: string | null;
  // Variable + indirect per unit, or null when it cannot be computed.
  unitCost: string | null;
};

export type CostDistribution = {
  period: string;
  status: CostDistributionStatus;
  // Sum of the saved period expenses (#243).
  totalExpenses: string;
  rows: CostDistributionRow[];
};

// The persisted exact fraction avoids carrying the rounded display value into
// the sum; the engine rounds once at the end.
function displayMoney(value: string): string {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

function baseRow(sale: SaleRow): CostDistributionRow {
  return {
    rowId: sale.rowId,
    productId: sale.productId,
    presentationId: sale.presentationId,
    name: sale.name,
    capacity: sale.capacity,
    ownMarkupPercent: sale.ownMarkupPercent,
    editHref: sale.editHref,
    absorbsExpenses: false,
    share: null,
    // Shown only when the row is left out of the spread. Rows that absorb
    // expenses replace this with the value the proration rounded once.
    variableUnit: sale.variableUnit === null ? null : displayMoney(sale.variableUnit),
    variableUnavailableCode: sale.variableUnavailableCode,
    indirectUnit: null,
    fixedShare: null,
    unitCost: null,
  };
}

function withProration(row: CostDistributionRow, cost: ProratedCost): CostDistributionRow {
  return {
    ...row,
    absorbsExpenses: true,
    share: cost.share,
    variableUnit: cost.variableUnit ?? row.variableUnit,
    indirectUnit: cost.indirectUnit,
    fixedShare: cost.fixedShare,
    unitCost: cost.unitCost,
  };
}

/**
 * Prorratea los gastos del período sobre los productos activos del negocio del
 * usuario, según su capacidad mensual, y devuelve el costo total por unidad.
 *
 * @throws AppError CALC_COST_SUMMARY_FAILED cuando el motor rechaza datos ya
 * guardados (importe o capacidad inválidos): es un problema de datos del
 * servidor, no de la entrada del usuario.
 */
export async function getCostDistributionService(
  userId: VerifiedUserId,
  opts: ListPeriodCostsOptions = {},
  db: Db = getDrizzleClient(),
): Promise<CostDistribution> {
  const [periodCosts, catalog] = await Promise.all([
    listPeriodCostsService(userId, opts, db),
    listSaleRowsService(userId, db),
  ]);

  const rows = catalog.map(baseRow);
  const result = (status: CostDistributionStatus): CostDistribution => ({
    period: periodCosts.period,
    status,
    totalExpenses: periodCosts.total,
    rows,
  });

  const absorbing = catalog.filter((row) => (row.capacity ?? 0) > 0);
  if (absorbing.length === 0) {
    return result("no_capacity");
  }

  if (periodCosts.lines.length === 0 || new Decimal(periodCosts.total).isZero()) {
    return result("no_expenses");
  }

  const proration = calculateProration({
    lines: periodCosts.lines.map((line) => ({ id: line.id, amount: line.amountPeriod })),
    products: absorbing.map((row) => ({
      id: row.rowId,
      capacity: row.capacity ?? 0,
      // The exact fraction, not the rounded display value.
      variableUnit: row.variableUnit,
    })),
  });

  if (!proration.ok) {
    throw new AppError("CALC_COST_SUMMARY_FAILED", undefined, { cause: proration });
  }

  const costsByRow = new Map(proration.costs.map((cost) => [cost.productId, cost]));
  const distributed = rows.map((row) => {
    const cost = costsByRow.get(row.rowId);
    return cost ? withProration(row, cost) : row;
  });

  return {
    period: periodCosts.period,
    status: distributed.some((row) => row.unitCost !== null) ? "ready" : "unavailable",
    totalExpenses: periodCosts.total,
    rows: distributed,
  };
}
