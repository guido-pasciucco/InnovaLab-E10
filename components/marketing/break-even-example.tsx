import { CheckCircleIcon, TargetIcon } from "@/components/home/icons";
import { container, eyebrow, sectionLead, sectionTitle } from "@/components/home/styles";
import { BreakEvenChart } from "./break-even-chart";
import { referenceRows, referenceTotals } from "./reference-example";

export function BreakEvenExample() {
  return (
    <section
      id="equilibrio"
      aria-labelledby="break-even-title"
      className="scroll-mt-36 py-16 sm:py-20"
    >
      <div className={container}>
        <div className="max-w-3xl">
          <p className={eyebrow}>Punto de equilibrio</p>
          <h2 id="break-even-title" className={sectionTitle}>
            Toda la mezcla de productos{" "}
            <span className="text-link">define el punto de equilibrio</span>
          </h2>
          <p className={sectionLead}>
            Cada producto influye en este punto según la cantidad que fabricás por mes. Con el
            ejemplo de los alfajores, los gastos de {referenceTotals.fixedCosts} se cubren vendiendo{" "}
            {referenceRows[0].wholeUnits} unidades y {referenceRows[1].wholeUnits} cajas x6.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="rounded-[28px] border border-border-default bg-surface p-4 shadow-[0_24px_70px_-40px_rgba(11,107,79,0.45)] sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-action-tonal text-link">
                <TargetIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-fg">Punto de equilibrio · ejemplo</p>
                <p className="mt-0.5 text-[11px] text-fg-muted">Dos presentaciones, un gasto mensual</p>
              </div>
            </div>

            <div className="mt-3">
              <BreakEvenChart />
            </div>

            <p className="mt-4 rounded-xl bg-action-tonal px-3 py-2.5 text-xs leading-5 text-fg-muted">
              Ventas de equilibrio:{" "}
              <strong className="font-bold text-link">{referenceTotals.breakEvenSales}</strong>
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border-default bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <caption className="sr-only">
                  Costos, precios y unidades de equilibrio del ejemplo de alfajores
                </caption>
                <thead className="bg-surface-tint text-xs text-fg-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Presentación
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      Costo variable
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      Costo fijo
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      Costo total
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      Precio
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      Contribución
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      Unidades
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {referenceRows.map((row) => (
                    <tr key={row.name}>
                      <th scope="row" className="whitespace-nowrap px-4 py-3 font-semibold text-fg">
                        {row.name}
                      </th>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-fg-muted">
                        {row.variableUnit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-fg-muted">
                        {row.indirectUnit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-fg-muted">
                        {row.unitCost}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-fg">
                        {row.price}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-fg-muted">
                        {row.contribution}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-link">
                        {row.exactUnits} → {row.wholeUnits}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="border-t border-border-default bg-action-tonal px-4 py-3 text-xs leading-6 text-fg-muted">
              Prueba de cierre: {referenceRows[0].exactUnits} × {referenceRows[0].contribution} +{" "}
              {referenceRows[1].exactUnits} × {referenceRows[1].contribution} ={" "}
              <strong className="font-bold text-link">{referenceTotals.closingContribution}</strong>
            </p>
          </div>
        </div>

        <p className="mt-6 flex items-start gap-2 text-sm leading-6 text-fg-muted">
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-link" />
          Las unidades se redondean hacia arriba: no se puede vender una fracción de unidad. Los
          gastos se reparten por la cantidad que hacés por mes, así que el costo fijo por unidad es
          el mismo en todas las presentaciones.
        </p>
      </div>
    </section>
  );
}
