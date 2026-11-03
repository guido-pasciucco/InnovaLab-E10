import { formatARSCompact } from "@/lib/money/format";
import type { CalculatorSummary } from "@/lib/types/calculator";

import { percentLabel } from "./scenarios-step-values";

// Maps the step 8 read model to the summary rows, and to the plain text that
// "Copiar resumen" and the PDF share. The figures come from the server; this
// module only formats them, so the screen, the clipboard and the PDF agree.

export type SummaryRow = { label: string; value: string };

const DASH = "—";

export const SUMMARY_TITLE = "Resumen de costos";
export const SUMMARY_DISCLAIMER =
  "Herramienta de apoyo: no reemplaza el asesoramiento contable o impositivo.";

function money(value: string | null): string {
  if (value === null) return DASH;
  return formatARSCompact(value) || DASH;
}

function breakEvenLabel(units: string | null, sales: string | null): string {
  if (units === null || sales === null) return DASH;
  return `${units} u. · ${money(sales)}`;
}

export function toSummaryRows(summary: CalculatorSummary): SummaryRow[] {
  return [
    { label: "Producto", value: summary.productName ?? DASH },
    { label: "Costo unitario", value: money(summary.unitCost) },
    { label: "Precio sugerido", value: money(summary.suggestedPrice) },
    {
      label: "Margen real",
      value: summary.realMarginPct === null ? DASH : percentLabel(summary.realMarginPct),
    },
    { label: "Ganancia estimada", value: money(summary.estimatedProfit) },
    {
      label: "Equilibrio",
      value: breakEvenLabel(summary.breakEvenUnits, summary.breakEvenSales),
    },
  ];
}

// Selling costs (commissions, fees) are not modeled yet, so the summary says
// they are left out instead of implying they are included.
export function summaryAssumptions(summary: Pick<CalculatorSummary, "period" | "volume">): string {
  const parts: string[] = [];
  if (summary.period !== null) parts.push(`período ${summary.period.toLowerCase()}`);
  if (summary.volume !== null) {
    parts.push(`${summary.volume} ${summary.volume === 1 ? "unidad" : "unidades"}`);
  }
  parts.push("sin costos de venta");

  return `Supuestos: ${parts.join(", ")}.`;
}

export function buildSummaryText(summary: CalculatorSummary): string {
  return [
    SUMMARY_TITLE,
    ...toSummaryRows(summary).map((row) => `${row.label}: ${row.value}`),
    "",
    summaryAssumptions(summary),
    SUMMARY_DISCLAIMER,
  ].join("\n");
}
