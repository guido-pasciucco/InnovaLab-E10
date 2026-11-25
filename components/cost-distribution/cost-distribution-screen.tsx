import Link from "next/link";

import type { CostDistributionView, DistributionRowView } from "./cost-distribution-values";

const linkClass =
  "inline-flex min-h-11 items-center justify-center rounded-[14px] px-5 py-2 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const primaryLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover active:bg-action-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const NOT_AVAILABLE = "No disponible";

type CostDistributionScreenProps = {
  view: CostDistributionView;
  // Whether there is at least one product in the catalog.
  hasProducts: boolean;
};

function Figure({ value, emphasis = false }: { value: string; emphasis?: boolean }) {
  const missing = value === NOT_AVAILABLE;

  return (
    <span
      className={
        missing ? "text-fg-muted" : emphasis ? "font-bold text-fg" : "text-fg"
      }
    >
      {value}
    </span>
  );
}

function ProductRow({ row }: { row: DistributionRowView }) {
  return (
    <tr className="border-b border-border-control align-top last:border-0">
      <th scope="row" className="min-w-40 px-2 py-3 text-left font-semibold text-fg">
        {row.name}
        {row.note && (
          <span className="mt-1 block text-xs font-normal text-warning">
            {row.note}{" "}
            {row.noteHref && (
              <Link href={row.noteHref} className="font-semibold text-link underline underline-offset-2">
                Cargar capacidad
              </Link>
            )}
          </span>
        )}
      </th>
      <td className="px-2 py-3 whitespace-nowrap text-fg-muted">{row.capacity}</td>
      <td className="px-2 py-3 whitespace-nowrap">
        <Figure value={row.share} />
      </td>
      <td className="px-2 py-3 whitespace-nowrap text-right">
        <Figure value={row.fixedShare} />
      </td>
      <td className="px-2 py-3 whitespace-nowrap text-right">
        <Figure value={row.variableUnit} />
      </td>
      <td className="px-2 py-3 whitespace-nowrap text-right">
        <Figure value={row.indirectUnit} />
      </td>
      <td className="px-2 py-3 whitespace-nowrap text-right">
        <Figure value={row.unitCost} emphasis />
      </td>
    </tr>
  );
}

// Presentation of the cost distribution screen (#244, guide P15): which part of
// the month's expenses each product absorbs and the total cost of one unit. It
// takes the view the page built from the server data, so it renders the same
// with real data and with a preview. The page shell, with the left sidebar of
// flow 1, comes from the (business) layout.
export function CostDistributionScreen({ view, hasProducts }: CostDistributionScreenProps) {
  const { banner, rows, explanation } = view;

  return (
    <main className="px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header>
          <p className="text-sm font-semibold tracking-wide text-brand-green-700 uppercase">
            Costos
          </p>
          <h1 className="mt-1 text-3xl font-bold text-fg sm:text-4xl">Costo total por producto</h1>
          <p className="mt-2 max-w-xl text-base text-fg-muted">
            Mirá qué parte de los gastos de {view.periodLabel} le toca a cada producto según lo que
            pensás fabricar, y cuánto cuesta en total una unidad.
          </p>
        </header>

        {banner && (
          <div
            role="status"
            className="flex flex-col gap-3 rounded-[16px] bg-warning-subtle p-4 text-sm text-fg sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold">{banner.title}</p>
              <p className="mt-1 text-fg-muted">{banner.text}</p>
            </div>
            <Link href={banner.action.href} className={primaryLinkClass}>
              {banner.action.label}
            </Link>
          </div>
        )}

        <section
          aria-labelledby="cost-distribution-heading"
          className="space-y-4 rounded-3xl bg-surface p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-1 border-b border-border-default pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="cost-distribution-heading" className="text-lg font-semibold text-fg">
                Reparto de gastos por producto
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Importes en pesos. Los gastos son del mes; los costos de cada columna se calculan
                por unidad.
              </p>
            </div>
            <p className="text-sm text-fg-muted">
              Gastos del mes:{" "}
              <span className="text-base font-bold whitespace-nowrap text-fg">{view.totalExpenses}</span>
            </p>
          </div>

          {!hasProducts ? (
            <div className="p-4 text-center">
              <p className="text-fg-muted">Todavía no cargaste ningún producto.</p>
              <Link href="/products" className={`${linkClass} mt-2`}>
                Ir a productos
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Reparto de los gastos del período y costo total por unidad de cada producto
                </caption>
                <thead>
                  <tr className="border-b border-border-control">
                    <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">
                      Producto
                    </th>
                    <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">
                      Capacidad mensual
                    </th>
                    <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">
                      Participación
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-right font-semibold text-fg-muted"
                    >
                      Gasto asignado (mes)
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-right font-semibold text-fg-muted"
                    >
                      Costo variable (por unidad)
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-right font-semibold text-fg-muted"
                    >
                      Gasto indirecto (por unidad)
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-3 text-right font-semibold text-fg-muted"
                    >
                      Costo total (por unidad)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <ProductRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {explanation && (
          <details className="rounded-3xl bg-surface p-5 shadow-sm sm:p-6">
            <summary className="cursor-pointer text-base font-semibold text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
              ¿Cómo se distribuyó?
            </summary>
            <div className="mt-4 space-y-3 text-sm text-fg-muted">
              <p>
                Cada producto absorbe los gastos en proporción a lo que pensás fabricar: su
                participación es su capacidad mensual sobre la suma de las capacidades de todos
                los productos con capacidad cargada.
              </p>
              <dl className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-[16px] bg-surface-tint p-3">
                  <dt>Gastos del mes</dt>
                  <dd className="mt-1 text-base font-bold text-fg">{explanation.totalExpenses}</dd>
                </div>
                <div className="rounded-[16px] bg-surface-tint p-3">
                  <dt>Suma de capacidades</dt>
                  <dd className="mt-1 text-base font-bold text-fg">{explanation.capacitySum}</dd>
                </div>
                <div className="rounded-[16px] bg-surface-tint p-3">
                  <dt>Gasto indirecto por unidad</dt>
                  <dd className="mt-1 text-base font-bold text-fg">{explanation.indirectUnit}</dd>
                </div>
              </dl>
              <p>
                El costo total de una unidad es su costo variable más ese gasto por unidad. Quien
                fabrica más absorbe más pesos de gastos en total.
              </p>
            </div>
          </details>
        )}

        <nav aria-label="Editar datos del cálculo" className="flex flex-col gap-2 sm:flex-row">
          <Link href="/products" className={linkClass}>
            Editar capacidad de los productos
          </Link>
          <Link href="/period-costs" className={linkClass}>
            Editar gastos del período
          </Link>
        </nav>
      </div>
    </main>
  );
}
