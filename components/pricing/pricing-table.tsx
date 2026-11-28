import Link from "next/link";
import type { ReactNode } from "react";

import { NOT_AVAILABLE, type PricingRowView, type PricingView } from "./pricing-values";

const NOT_AVAILABLE_CLASS = "text-fg-muted";

export function PricingFigure({ value, emphasis = false }: { value: string; emphasis?: boolean }) {
  const missing = value === NOT_AVAILABLE;

  return (
    <span className={missing ? NOT_AVAILABLE_CLASS : emphasis ? "font-bold text-fg" : "text-fg"}>
      {value}
    </span>
  );
}

// One presentation of the pricing figures, shared by the editable screen and
// the read-only history screen so columns and labels cannot drift apart.
export function PricingTable({
  view,
  caption,
  renderMarkup,
  showNotes = true,
}: {
  view: PricingView;
  caption: string;
  renderMarkup: (row: PricingRowView) => ReactNode;
  showNotes?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border-control">
            <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">
              Producto
            </th>
            <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">
              Costo total (por unidad)
            </th>
            <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">
              Recargo
            </th>
            <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">
              Precio sugerido
            </th>
            <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">
              Ganancia (por unidad)
            </th>
            <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">
              Margen real
            </th>
          </tr>
        </thead>
        <tbody>
          {view.rows.map((row) => (
            <tr key={row.id} className="border-b border-border-control align-top last:border-0">
              <th scope="row" className="min-w-40 px-2 py-3 text-left font-semibold text-fg">
                {row.name}
                {showNotes && row.note && (
                  <span className="mt-1 block text-xs font-normal text-warning">
                    {row.note}{" "}
                    {row.noteHref && (
                      <Link href={row.noteHref} className="font-semibold underline underline-offset-2">
                        Cargar capacidad
                      </Link>
                    )}
                  </span>
                )}
                <span className="mt-1 block text-xs font-normal text-fg-muted">
                  Recargo vigente: {row.markupDisplay} · {row.markupSourceLabel}
                </span>
              </th>
              <td className="px-2 py-3 text-right whitespace-nowrap">
                <PricingFigure value={row.unitCost} />
              </td>
              <td className="px-2 py-3">{renderMarkup(row)}</td>
              <td className="px-2 py-3 text-right whitespace-nowrap">
                <PricingFigure value={row.suggestedPrice} emphasis />
              </td>
              <td className="px-2 py-3 text-right whitespace-nowrap">
                <PricingFigure value={row.profit} />
              </td>
              <td className="px-2 py-3 text-right whitespace-nowrap">
                <PricingFigure value={row.realMargin} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
