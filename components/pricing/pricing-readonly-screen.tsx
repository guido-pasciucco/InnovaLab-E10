import { PricingFigure, PricingTable } from "./pricing-table";
import type { PricingView } from "./pricing-values";

// Read-only twin of PricingScreen for a stored closure (#322). It reuses the
// same shared table as the editable screen but never imports a Server Action
// or a form, so a photo renders without any live calculation or editing control.
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
        <PricingTable
          view={view}
          caption="Costo total, recargo, precio sugerido, ganancia y margen real guardados en la foto"
          showNotes={false}
          renderMarkup={(row) => <PricingFigure value={row.markupDisplay} />}
        />
      )}
    </section>
  );
}
