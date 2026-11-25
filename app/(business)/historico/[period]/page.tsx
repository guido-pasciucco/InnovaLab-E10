import Link from "next/link";
import { notFound } from "next/navigation";

import { BreakEvenScreen } from "@/components/break-even/break-even-screen";
import { toBreakEvenView } from "@/components/break-even/break-even-values";
import { CostDistributionScreen } from "@/components/cost-distribution/cost-distribution-screen";
import { toCostDistributionView } from "@/components/cost-distribution/cost-distribution-values";
import { formatPeriod as formatMarkupPeriod, toPricingView } from "@/components/pricing/pricing-values";
import { PricingReadOnlyScreen } from "@/components/pricing/pricing-readonly-screen";
import { formatDateTime } from "@/components/tenders/format";
import { Card, PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { AppError } from "@/lib/errors/app-error";
import { formatARS } from "@/lib/money/format";
import {
  getCalculationClosureService,
  type CalculationClosureDetail,
} from "@/lib/services/calculation-closures";

const versionLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-[14px] border border-border-control px-4 py-2 text-sm font-semibold text-fg hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const activeVersionLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-[14px] bg-action-primary px-4 py-2 text-sm font-semibold text-on-action-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function formatPeriodLabel(period: string): string {
  return formatMarkupPeriod(period);
}

// The audit stores the exact strings the services produced. The view writes
// money as money and leaves counts, units and percentages as they were.
function formatChangeValue(label: string, value: string): string {
  if (!/^-?\d+(\.\d+)?$/.test(value)) return value;
  if (/unidades|capacidad|rendimiento|margen|recargo|mezcla/.test(label)) return value;
  return formatARS(value);
}

async function readDetail(
  userId: Parameters<typeof getCalculationClosureService>[0],
  period: string,
  version: number | undefined,
): Promise<CalculationClosureDetail> {
  try {
    return await getCalculationClosureService(userId, period, { version });
  } catch (error) {
    if (error instanceof AppError && error.code === "CALC_CLOSURE_NOT_FOUND") notFound();
    throw error;
  }
}

// One stored month (#322). All three tables come from the saved snapshot: not
// a single live calculation service is called on this route.
export default async function ClosureDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ period: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const user = await requireUser();
  const [{ period }, query] = await Promise.all([params, searchParams]);
  const requestedVersion = query.version ? Number(query.version) : undefined;
  const version = requestedVersion !== undefined && Number.isInteger(requestedVersion) ? requestedVersion : undefined;
  const detail = await readDetail(user.id, period, version);
  const snapshot = detail.closure.snapshot;
  const periodLabel = formatPeriodLabel(period);

  return (
    <PageShell
      eyebrow="Datos históricos"
      title={periodLabel}
      description={`Foto guardada el ${formatDateTime(detail.closure.closedAt)} · versión ${detail.closure.version}. Los datos son los de ese cierre, no los del catálogo actual.`}
      links={[
        { href: "/historico", label: "Todos los meses" },
        { href: "/equilibrio", label: "Equilibrio en vivo" },
      ]}
    >
      <Card title="Versión de la foto">
        <nav aria-label="Versiones del mes" className="flex flex-wrap gap-2">
          {detail.versions.map((item) => (
            <Link
              key={item.version}
              href={`/historico/${period}?version=${item.version}`}
              aria-current={item.version === detail.closure.version ? "page" : undefined}
              className={
                item.version === detail.closure.version ? activeVersionLinkClass : versionLinkClass
              }
            >
              Versión {item.version} · {formatDateTime(item.closedAt)}
            </Link>
          ))}
        </nav>
        <p className="mt-4 text-sm text-fg-muted">
          Esquema de la foto: {detail.closure.snapshotSchemaVersion}. Archivo de {periodLabel}:{" "}
          {snapshot.inputs.supplies.length} insumos, {snapshot.inputs.products.length} productos y{" "}
          {snapshot.inputs.periodCostLines.length} gastos del período.
        </p>
      </Card>

      <Card title="Cambios respecto de la versión anterior">
        {detail.changes.length === 0 ? (
          <p className="text-sm text-fg-muted">
            {detail.versions.length === 1
              ? "Esta es la primera versión del mes. Volvé a cerrar desde Equilibrio para generar una nueva y ver acá campo, antes, después y cuándo."
              : "La versión 1 no tiene una anterior con la que compararse."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Diferencias entre la versión elegida y la anterior
              </caption>
              <thead>
                <tr className="border-b border-border-control">
                  <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">Qué cambió</th>
                  <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">Antes</th>
                  <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">Después</th>
                  <th scope="col" className="px-2 py-3 font-semibold text-fg-muted">Cuándo</th>
                </tr>
              </thead>
              <tbody>
                {detail.changes.map((change) => (
                  <tr key={change.label} className="border-b border-border-control align-top last:border-0">
                    <th scope="row" className="px-2 py-3 font-semibold text-fg">{change.label}</th>
                    <td className="px-2 py-3 text-fg-muted">
                      {formatChangeValue(change.label, change.before)}
                    </td>
                    <td className="px-2 py-3 text-fg">
                      {formatChangeValue(change.label, change.after)}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-fg-muted">
                      {formatDateTime(change.changedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CostDistributionScreen
        view={toCostDistributionView(snapshot.results.costDistribution)}
        hasProducts={snapshot.inputs.products.length > 0}
        showEditLinks={false}
      />
      <PricingReadOnlyScreen view={toPricingView(snapshot.results.pricing)} />
      <BreakEvenScreen view={toBreakEvenView(snapshot.results.breakEven)} />
    </PageShell>
  );
}
