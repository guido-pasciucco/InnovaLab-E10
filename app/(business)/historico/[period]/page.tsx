import Link from "next/link";
import { notFound } from "next/navigation";

import { BreakEvenScreen } from "@/components/break-even/break-even-screen";
import { toBreakEvenView } from "@/components/break-even/break-even-values";
import { CostDistributionScreen } from "@/components/cost-distribution/cost-distribution-screen";
import { toCostDistributionView } from "@/components/cost-distribution/cost-distribution-values";
import { formatPeriod, toPricingView } from "@/components/pricing/pricing-values";
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

// The audit carries the value kind from the module that produced it, so the
// view never has to guess currency from a human-readable label.
function formatChangeValue(change: CalculationClosureDetail["changes"][number], value: string): string {
  if (change.kind !== "money" || !/^-?\d+(\.\d+)?$/.test(value)) return value;
  return formatARS(value);
}

async function readDetail(
  userId: Parameters<typeof getCalculationClosureService>[0],
  period: string,
  version: number | undefined,
): Promise<CalculationClosureDetail | null> {
  try {
    return await getCalculationClosureService(userId, period, { version });
  } catch (error) {
    if (error instanceof AppError && error.code === "CALC_CLOSURE_NOT_FOUND") notFound();
    if (error instanceof AppError && error.code === "CALC_CLOSURE_FORMAT_UNSUPPORTED") return null;
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

  if (detail === null) {
    return (
      <PageShell
        eyebrow="Datos históricos"
        title={formatPeriod(period)}
        description="Esta foto se guardó con otro formato y no se puede mostrar."
        links={[{ href: "/historico", label: "Todos los meses" }]}
      >
        <Card title="Foto no disponible">
          <p className="text-sm text-fg-muted">
            Probá con otra versión del mes o volvé a cerrar el cálculo desde Equilibrio.
          </p>
        </Card>
      </PageShell>
    );
  }

  const snapshot = detail.snapshot;
  const periodLabel = formatPeriod(period);

  return (
    <PageShell
      eyebrow="Datos históricos"
      title={periodLabel}
      description={`Foto guardada el ${formatDateTime(detail.closedAt)} · versión ${detail.version}. Los datos son los de ese cierre, no los del catálogo actual.`}
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
              aria-current={item.version === detail.version ? "page" : undefined}
              className={
                item.version === detail.version ? activeVersionLinkClass : versionLinkClass
              }
            >
              Versión {item.version} · {formatDateTime(item.closedAt)}
            </Link>
          ))}
        </nav>
        <p className="mt-4 text-sm text-fg-muted">
          Esquema de la foto: {detail.schemaVersion}. Archivo de {periodLabel}:{" "}
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
                  <tr key={change.key} className="border-b border-border-control align-top last:border-0">
                    <th scope="row" className="px-2 py-3 font-semibold text-fg">{change.label}</th>
                    <td className="px-2 py-3 text-fg-muted">
                      {formatChangeValue(change, change.before)}
                    </td>
                    <td className="px-2 py-3 text-fg">
                      {formatChangeValue(change, change.after)}
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
