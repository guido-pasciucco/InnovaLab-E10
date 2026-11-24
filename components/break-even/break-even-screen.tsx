import type { ReactNode } from "react";
import Link from "next/link";

import type { BreakEvenView, BreakEvenViewRow } from "./break-even-values";

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover active:bg-action-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function ProductRow({ row }: { row: BreakEvenViewRow }) {
  return (
    <tr className="border-b border-border-control align-top last:border-0">
      <th
        scope="row"
        className="sticky left-0 min-w-40 bg-surface px-3 py-4 text-left font-semibold text-fg"
      >
        {row.name}
        {row.hasNegativeContribution && (
          <span className="mt-1 block text-xs font-normal text-warning">
            El precio no cubre el costo variable.
          </span>
        )}
      </th>
      <td className="whitespace-nowrap px-3 py-4 text-right">{row.price}</td>
      <td className="whitespace-nowrap px-3 py-4 text-right">{row.variableUnit}</td>
      <td className="whitespace-nowrap px-3 py-4 text-right">{row.contributionUnit}</td>
      <td className="whitespace-nowrap px-3 py-4 text-right">{row.marginPct}</td>
      <td className="whitespace-nowrap px-3 py-4 text-right">{row.mixPct}</td>
      <td className="whitespace-nowrap px-3 py-4 text-right">
        <strong className="block text-fg">{row.quotaWhole}</strong>
        <span className="text-xs text-fg-muted">{row.quotaExact}</span>
      </td>
    </tr>
  );
}

export function BreakEvenScreen({ view, chart }: { view: BreakEvenView; chart?: ReactNode }) {
  return (
    <main className="px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header>
          <p className="text-sm font-semibold tracking-wide text-brand-green-700 uppercase">
            Catálogo
          </p>
          <h1 className="mt-1 text-3xl font-bold text-fg sm:text-4xl">Punto de equilibrio</h1>
          <p className="mt-2 max-w-2xl text-base text-fg-muted">
            Conocé cuánto necesitás vender para cubrir los gastos del mes sin ganar ni perder.
          </p>
        </header>

        {view.banner && (
          <section
            aria-labelledby="break-even-status"
            className="flex flex-col gap-3 rounded-[16px] bg-warning-subtle p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 id="break-even-status" className="font-semibold text-fg">
                {view.banner.title}
              </h2>
              <p className="mt-1 text-fg-muted">{view.banner.text}</p>
            </div>
            {view.banner.href && view.banner.action && (
              <Link href={view.banner.href} className={actionClass}>
                {view.banner.action}
              </Link>
            )}
          </section>
        )}

        {view.summary && (
          <section aria-labelledby="break-even-summary" className="space-y-4">
            <h2 id="break-even-summary" className="text-lg font-semibold text-fg">
              Resumen del mes
            </h2>
            <dl className="grid gap-4 sm:grid-cols-3">
              {[
                ["Gastos del mes", view.summary.expenses],
                ["Unidades para equilibrar", view.summary.units],
                ["Equilibrio en ventas", view.summary.sales],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl bg-surface p-5 shadow-sm">
                  <dt className="text-sm text-fg-muted">{label}</dt>
                  <dd className="mt-2 text-2xl font-bold text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {view.hasNegativeContribution && (
          <p className="rounded-[16px] bg-warning-subtle p-4 text-sm text-fg">
            Al menos un producto tiene contribución negativa. El cálculo usa la mezcla completa;
            revisá los productos señalados.
          </p>
        )}

        {view.rows.length > 0 && (
          <section aria-labelledby="break-even-table-heading" className="rounded-3xl bg-surface p-5 shadow-sm sm:p-6">
            <h2 id="break-even-table-heading" className="text-lg font-semibold text-fg">
              Equilibrio por producto
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              La cuota entera es la cantidad mínima a vender; debajo se conserva el cálculo exacto.
            </p>
            <div
              role="region"
              aria-labelledby="break-even-table-caption"
              tabIndex={0}
              className="mt-4 max-w-full overflow-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <table className="w-full border-separate border-spacing-0 text-sm">
                <caption id="break-even-table-caption" className="sr-only">
                  Precio, costos, contribución, margen, mezcla y cuota de equilibrio por producto
                </caption>
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b border-border-control">
                    {[
                      "Producto",
                      "Precio",
                      "Costo variable",
                      "Contribución",
                      "Margen real",
                      "Mezcla",
                      "Cuota",
                    ].map((label, index) => (
                      <th
                        key={label}
                        scope="col"
                        className={`whitespace-nowrap px-3 py-3 font-semibold text-fg-muted ${index === 0 ? "sticky left-0 z-20 bg-surface text-left" : "text-right"}`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{view.rows.map((row) => <ProductRow key={row.id} row={row} />)}</tbody>
              </table>
            </div>
          </section>
        )}

        {view.closingContribution && (
          <section aria-labelledby="closing-check" className="rounded-3xl bg-surface-tint p-5">
            <h2 id="closing-check" className="font-semibold text-fg">Prueba de cierre</h2>
            <p className="mt-1 text-sm text-fg-muted">
              La contribución de las cuotas exactas cubre los gastos del mes: {" "}
              <strong className="text-fg">{view.closingContribution}</strong>.
            </p>
          </section>
        )}

        {view.exclusions.length > 0 && (
          <section aria-labelledby="excluded-products" className="rounded-3xl bg-surface p-5 shadow-sm sm:p-6">
            <h2 id="excluded-products" className="text-lg font-semibold text-fg">Productos a revisar</h2>
            <ul className="mt-3 space-y-2">
              {view.exclusions.map((product) => (
                <li key={product.productId} className="text-sm text-fg-muted">
                  <strong className="text-fg">{product.name}:</strong> {product.message}
                </li>
              ))}
            </ul>
          </section>
        )}

        {chart}
      </div>
    </main>
  );
}
