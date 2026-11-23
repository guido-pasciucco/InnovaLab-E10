"use client";

import { useMemo } from "react";

import {
  addPeriodCostLine,
  removePeriodCostLine,
  renamePeriodCostLine,
  updatePeriodCostLineAmount,
} from "@/app/period-costs/actions";
import { CostLinesTable } from "@/components/period-costs/cost-lines-table";
import type { CostLineActions } from "@/components/period-costs/cost-line-row-item";
import { toCostLine, type PeriodCostLineView } from "./period-costs-values";

type PeriodCostsTableProps = {
  // The month the screen is showing, as "AAAA-MM". It travels with a new line
  // so the saved row belongs to the same month the user is looking at.
  period: string;
  lines: readonly PeriodCostLineView[];
  // The server's sum of the saved lines, as a decimal string.
  total: string;
};

// Adapts the shared cost line table to the period expenses service: the
// calculator names the column `amount`, the service calls it `amountPeriod`.
// The table keeps owning the rows, the focus and the save-on-leave behaviour.
export function PeriodCostsTable({ period, lines, total }: PeriodCostsTableProps) {
  const actions = useMemo<CostLineActions>(
    () => ({
      add: ({ concept, amount }) =>
        addPeriodCostLine({ period, concept, amountPeriod: amount }),
      rename: (lineId, input) => renamePeriodCostLine(lineId, input),
      updateAmount: (lineId, { amount }) =>
        updatePeriodCostLineAmount(lineId, { amountPeriod: amount }),
      remove: (lineId) => removePeriodCostLine(lineId),
    }),
    [period],
  );

  const rows = useMemo(() => lines.map(toCostLine), [lines]);

  return (
    <CostLinesTable
      lines={rows}
      total={total}
      actions={actions}
      listLabel="Gastos del período"
      subtotalLabel="Total de gastos del período"
      addLabel="Agregar gasto"
      amountLabel="Importe del mes"
    />
  );
}
