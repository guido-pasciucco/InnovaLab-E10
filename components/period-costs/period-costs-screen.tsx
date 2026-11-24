import { PeriodCostsCatalog } from "./period-costs-catalog";
import type { PeriodCostLineView } from "./period-costs-values";

type PeriodCostsScreenProps = {
  // The month the screen is showing, as "AAAA-MM".
  period: string;
  lines: readonly PeriodCostLineView[];
  // The server's sum of the saved lines, as a decimal string.
  total: string;
};

// Presentation of the period expenses screen (#243, catalog pattern in #285).
// It takes the data the page read from the server, so it renders the same with
// the real lines and with a preview. The page shell — including the left
// sidebar of flow 1 — comes from the (business) layout.
export function PeriodCostsScreen({ period, lines, total }: PeriodCostsScreenProps) {
  return (
    <main className="px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header>
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
        </header>

        <PeriodCostsCatalog period={period} lines={[...lines]} total={total} />
      </div>
    </main>
  );
}
