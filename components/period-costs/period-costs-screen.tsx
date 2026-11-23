import { PeriodCostsTable } from "./period-costs-table";
import { formatPeriodLabel, type PeriodCostLineView } from "./period-costs-values";

type PeriodCostsScreenProps = {
  // The month the screen is showing, as "AAAA-MM".
  period: string;
  lines: readonly PeriodCostLineView[];
  // The server's sum of the saved lines, as a decimal string.
  total: string;
};

// Presentation of the period expenses screen (#243). It takes the data the
// page read from the server, so it renders the same with the real lines and
// with a preview.
export function PeriodCostsScreen({ period, lines, total }: PeriodCostsScreenProps) {
  return (
    <main className="min-h-screen bg-surface-tint px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brand-green-700 uppercase">
              Gastos indirectos
            </p>
            <h1 className="mt-1 text-3xl font-bold text-fg sm:text-4xl">
              Gastos del período
            </h1>
            <p className="mt-2 max-w-xl text-base text-fg-muted">
              Cargalos una sola vez para toda tu lista de productos: no hace falta
              repetirlos producto por producto.
            </p>
          </div>
        </header>

        <section
          aria-labelledby="period-costs-heading"
          className="rounded-[24px] bg-surface p-5 shadow-sm sm:p-6"
        >
          <div className="border-b border-border-default pb-4">
            <h2 id="period-costs-heading" className="text-lg font-semibold text-fg">
              Gastos de {formatPeriodLabel(period)}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Alquiler, servicios y otros gastos que pagás todos los meses. Quedan
              guardados una sola vez para toda tu lista de productos.
            </p>
          </div>

          <div className="mt-4">
            {lines.length === 0 && (
              <p className="mb-4 text-sm text-fg-muted">
                Todavía no cargaste gastos de este mes. Empezá con el alquiler o
                los servicios.
              </p>
            )}
            <PeriodCostsTable period={period} lines={lines} total={total} />
          </div>
        </section>
      </div>
    </main>
  );
}
