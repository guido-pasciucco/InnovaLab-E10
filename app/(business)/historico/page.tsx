import Link from "next/link";

import { formatPeriod } from "@/components/pricing/pricing-values";
import { formatDateTime } from "@/components/tenders/format";
import { Card, PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { formatARS } from "@/lib/money/format";
import { listCalculationClosuresService } from "@/lib/services/calculation-closures";

const linkClass =
  "inline-flex min-h-11 items-center justify-center rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// Index of closed months (#322). Every number comes from the stored photo.
export default async function HistoricoPage() {
  const user = await requireUser();
  const months = await listCalculationClosuresService(user.id);

  return (
    <PageShell
      eyebrow="Resultados"
      title="Datos históricos"
      description="Fotos de los meses que cerraste. Consultalas sin recalcular nada: cambiar el catálogo no las modifica."
      links={[{ href: "/equilibrio", label: "Volver al equilibrio" }]}
    >
      {months.length === 0 ? (
        <Card>
          <p className="text-fg">Todavía no cerraste ningún mes.</p>
          <p className="mt-2 text-sm text-fg-muted">
            Andá a Equilibrio y tocá «Cerrar el cálculo» para guardar una foto del mes actual. Si
            después cambiás algo y volvés a cerrar, se guarda una versión nueva sin borrar la anterior.
          </p>
          <Link href="/equilibrio" className={`${linkClass} mt-5`}>
            Ir a Equilibrio
          </Link>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Meses cerrados, del más reciente al más antiguo</caption>
              <thead>
                <tr className="border-b border-border-control">
                  <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">Mes</th>
                  <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">Último cierre</th>
                  <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">Versiones</th>
                  <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">Gastos del mes</th>
                  <th scope="col" className="px-2 py-3 text-right font-semibold text-fg-muted">Ventas de equilibrio</th>
                </tr>
              </thead>
              <tbody>
                {months.map((month) => (
                  <tr key={month.period} className="border-b border-border-control last:border-0">
                    <th scope="row" className="px-2 py-3 font-semibold text-fg">
                      <Link href={`/historico/${month.period}`} className="text-link hover:underline">
                        {formatPeriod(month.period)}
                      </Link>
                    </th>
                    <td className="px-2 py-3 whitespace-nowrap text-fg-muted">
                      {formatDateTime(month.lastClosedAt)}
                    </td>
                    <td className="px-2 py-3 text-right text-fg">{month.versionCount}</td>
                    <td className="px-2 py-3 text-right whitespace-nowrap text-fg">
                      {formatARS(month.totalExpenses)}
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap text-fg">
                      {month.breakEvenSales === null ? "No disponible" : formatARS(month.breakEvenSales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
