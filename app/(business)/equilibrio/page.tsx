import Link from "next/link";

import { BreakEvenChart } from "@/components/break-even/break-even-chart";
import { BreakEvenScreen } from "@/components/break-even/break-even-screen";
import { toBreakEvenView } from "@/components/break-even/break-even-values";
import { CloseCalculationButton } from "@/components/closures/close-calculation-button";
import { formatPeriod } from "@/components/pricing/pricing-values";
import { formatDateTime } from "@/components/tenders/format";
import { Card, PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { buildBreakEvenChart } from "@/lib/calc/buildBreakEvenChart";
import { getBreakEvenService } from "@/lib/services/break-even";
import { getLatestClosureService } from "@/lib/services/calculation-closures";
import { getPricingService } from "@/lib/services/pricing";

// Protected break-even screen (#246/#247) and the last step of the live flow
// (#322): the user reads the break-even and can close the month. Everything
// here is derived on each read; the historical view reads stored photos.
export default async function BreakEvenPage() {
  const user = await requireUser();
  const pricing = await getPricingService(user.id);
  const breakEven = await getBreakEvenService(user.id, {
    getPricing: async () => pricing,
  });
  const latest = await getLatestClosureService(user.id, { period: pricing.period });
  const chartData = buildBreakEvenChart(breakEven);
  const view = toBreakEvenView(breakEven);
  const periodLabel = formatPeriod(breakEven.period);

  const confirmation =
    `Vas a guardar una foto de ${periodLabel} con los datos de hoy. ` +
    "Si cambiás algo, podés volver a cerrar y se guarda una versión nueva." +
    (breakEven.status === "ready"
      ? ""
      : " El equilibrio todavía no está completo; la foto lo guarda así.");

  return (
    <PageShell
      eyebrow="Resultados"
      title="Equilibrio"
      description="Ventas por mes para cubrir los gastos, con la mezcla de productos que pensás fabricar."
      actions={
        <CloseCalculationButton
          label={`Cerrar el cálculo de ${periodLabel}`}
          confirmation={confirmation}
        />
      }
    >
      <Card>
        {latest ? (
          <p className="text-sm text-fg-muted">
            Último cierre: {formatDateTime(latest.closedAt)} · versión {latest.version}.{" "}
            <Link href="/historico" className="font-semibold text-link hover:underline">
              Ver histórico
            </Link>
          </p>
        ) : (
          <p className="text-sm text-fg-muted">
            Todavía no cerraste este mes. Al cerrar se guarda una foto que podés consultar en{" "}
            <Link href="/historico" className="font-semibold text-link hover:underline">
              Datos históricos
            </Link>
            .
          </p>
        )}
      </Card>

      <BreakEvenScreen
        view={view}
        chart={chartData ? <BreakEvenChart data={chartData} /> : undefined}
      />
    </PageShell>
  );
}
