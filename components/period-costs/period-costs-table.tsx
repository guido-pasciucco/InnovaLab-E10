"use client";

import { formatARSCompact } from "@/lib/money/format";
import type { PeriodCostLineView } from "./period-costs-values";

type PeriodCostsTableProps = {
  lines: PeriodCostLineView[];
  // Sum of every saved line of the month, as a decimal string from the server
  // (recomputed on the client after each mutation so the total reacts at once).
  total: string;
  busy?: boolean;
  searchActive?: boolean;
  // Whether the month has any saved line. A search can hide every row without
  // emptying the catalog, and the total must not turn into a dash in that case.
  hasLines?: boolean;
  onEdit: (line: PeriodCostLineView) => void;
  onDelete: (line: PeriodCostLineView) => void;
};

// Read-only table of the period expenses catalog (#285). It mirrors the
// Insumos/Productos lists: one card, a header row, one row per line with its
// actions on the right, and an empty state that explains what to do next.
export function PeriodCostsTable({
  lines,
  total,
  busy = false,
  searchActive = false,
  hasLines = true,
  onEdit,
  onDelete,
}: PeriodCostsTableProps) {
  const totalText = hasLines ? formatARSCompact(total) || "—" : "—";

  if (lines.length === 0) {
    return (
      <div className="rounded-[24px] bg-surface p-8 text-center shadow-sm">
        {searchActive ? (
          <>
            <p className="text-fg-muted">No encontramos gastos con esa búsqueda.</p>
            <p className="mt-1 text-sm text-fg-muted">Probá con otro concepto.</p>
          </>
        ) : (
          <>
            <p className="text-fg-muted">Todavía no cargaste gastos de este mes.</p>
            <p className="mt-1 text-sm text-fg-muted">
              Tocá &ldquo;+ Nuevo&rdquo; para cargar el alquiler, los servicios u otro gasto fijo.
            </p>
          </>
        )}
        {/* Keep the total visible (and announced) even with an empty list. */}
        <div className="mt-6 flex flex-wrap items-baseline justify-center gap-2 border-t border-border-default pt-4">
          <span className="text-sm font-semibold text-fg">
            Total de gastos del período
          </span>
          <span
            aria-label={`Total de gastos del período ${totalText}`}
            aria-live="polite"
            className="text-lg font-bold text-brand-green-600"
          >
            {totalText}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[24px] bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-control">
            <th scope="col" className="min-w-48 px-3 py-3 font-semibold text-fg-muted">
              Concepto
            </th>
            <th
              scope="col"
              className="px-3 py-3 whitespace-nowrap text-right font-semibold text-fg-muted"
            >
              Importe del mes
            </th>
            <th
              scope="col"
              className="px-3 py-3 whitespace-nowrap text-right font-semibold text-fg-muted"
            >
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-b border-border-control last:border-0">
              <td className="min-w-48 px-3 py-3 text-fg">{line.concept}</td>
              <td className="px-3 py-3 whitespace-nowrap text-right text-fg">
                {formatARSCompact(line.amountPeriod)}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-right">
                <div className="inline-flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(line)}
                    disabled={busy}
                    aria-label={`Editar ${line.concept}`}
                    className="min-h-9 rounded-[10px] border border-border-control px-2 py-1 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(line)}
                    disabled={busy}
                    aria-label={`Borrar ${line.concept}`}
                    className="min-h-9 rounded-[10px] border border-border-control px-2 py-1 text-sm font-semibold text-danger hover:bg-danger/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                  >
                    Borrar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border-default bg-surface-tint">
            <th scope="row" className="px-3 py-3 text-left font-semibold text-fg">
              Total de gastos del período
            </th>
            <td
              aria-label={`Total de gastos del período ${totalText}`}
              aria-live="polite"
              colSpan={2}
              className="px-3 py-3 whitespace-nowrap text-right text-lg font-bold text-brand-green-600"
            >
              {totalText}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
