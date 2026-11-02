import {
  calculateCostTotals,
  type CostTotalsErrorCode,
  type MoneyString,
} from "./calculateCostTotals";

// The fixed-cost subtotal of step 2. The cost dimensions of this step are
// constants (every row is a direct, fixed cost that is not own labour), so
// they live here instead of in the table that lists the rows.

export type FixedSubtotalRow = {
  id: string;
  // A valid decimal string, or "" while the row has no valid amount.
  amount: string;
};

// `subtotal` is null when no row has an amount yet: there is nothing to add,
// and zero would read as a real total. `ok: false` carries the engine's code so
// the caller decides how to surface a failure instead of it being swallowed.
export type FixedSubtotalResult =
  | { ok: true; subtotal: MoneyString | null }
  | { ok: false; code: CostTotalsErrorCode };

// The subtotal does not depend on the volume (it is only the divisor of the
// unit cost), so any valid volume gives the same fixed total.
const NEUTRAL_VOLUME = 1;

export function calculateFixedSubtotal(
  rows: readonly FixedSubtotalRow[],
): FixedSubtotalResult {
  const lines = rows
    .filter((row) => row.amount !== "")
    .map((row) => ({
      id: row.id,
      behavior: "fixed" as const,
      traceability: "direct" as const,
      isOwnLabor: false,
      amount: row.amount,
    }));

  if (lines.length === 0) {
    return { ok: true, subtotal: null };
  }

  const totals = calculateCostTotals({ lines, volume: NEUTRAL_VOLUME });

  return totals.ok
    ? { ok: true, subtotal: totals.subtotalFijo }
    : { ok: false, code: totals.code };
}
