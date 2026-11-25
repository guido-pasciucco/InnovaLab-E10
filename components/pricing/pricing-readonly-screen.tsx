import type { PricingView } from "./pricing-values";

const NOT_AVAILABLE = "No disponible";

function Figure({ value, emphasis = false }: { value: string; emphasis?: boolean }) {
  return (
    <span className={value === NOT_AVAILABLE ? "text-fg-muted" : emphasis ? "font-bold text-fg" : "text-fg"}>
      {value}
    </span>
  );
}

// Read-only twin of PricingScreen for a stored closure (#322). It reuses the
// same view mapper but never imports a Server Action or a form, so a photo can
// be rendered without any live calculation or editing control.
export function PricingReadOnlyScreen({ view }: { view: PricingView }) {
  return (
    <section aria-labelledby="history-pricing-heading" className="space-y-4 rounded-3xl bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-1 border-b border-border-default pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="history-pricing-heading" className="text-lg font-semibold text-fg">
            Precios de la foto
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Los importes son los que se guardaron al cerrar; no se recalculan.
          </p>
        </div>
        <p className="text-sm text-fg-muted">Período: {view.periodLabel}</p>
      </div>

      {view.rows.length === 0 ? (
        <p className="p-4 text-center text-fg-muted">Esta foto no tiene productos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Costo total, recargo, precio sugerido, ganancia y margen real guardados en la foto
            </caption>
            <thead>
              <tr className="border-b border-border-control">
                <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">Producto</th>
                <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">Costo total</th>
                <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">Recargo</th>
                <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">Precio sugerido</th>
                <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">Ganancia</th>
                <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">Margen real</th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
                <tr key={row.id} className="border-b border-border-control align-top last:border-0">
                  <th scope="row" className="min-w-40 px-2 py-3 text-left font-semibold text-fg">
                    {row.name}
                    <span className="mt-1 block text-xs font-normal text-fg-muted">
                      Recargo vigente: {row.markupDisplay} · {row.markupSourceLabel}
                    </span>
                  </th>
                  <td className="px-2 py-3 text-right whitespace-nowrap"><Figure value={row.unitCost} /></td>
                  <td className="px-2 py-3 whitespace-nowrap"><Figure value={row.markupDisplay} /></td>
                  <td className="px-2 py-3 text-right whitespace-nowrap"><Figure value={row.suggestedPrice} emphasis /></td>
                  <td className="px-2 py-3 text-right whitespace-nowrap"><Figure value={row.profit} /></td>
                  <td className="px-2 py-3 text-right whitespace-nowrap"><Figure value={row.realMargin} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
