import Link from "next/link";

import { formatDateTime } from "@/components/tenders/format";
import { PhaseBadge, roundLabel } from "@/components/tenders/phase-badge";
import { Card, PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { listTendersService } from "@/lib/services/tenders";

// The emprendedor's tenders, newest first. Data filtered by the session user.
export default async function TendersPage() {
  const user = await requireUser();
  const tenders = await listTendersService(user.id);
  const hasActive = tenders.some((tender) => tender.phase === "active");

  return (
    <PageShell
      eyebrow="Compras de insumos"
      title="Licitaciones"
      description="Publicá una compra y tus proveedores compiten por rondas, sin conocerse entre sí. Vos decidís a quién le comprás."
      links={[
        { href: "/proveedores", label: "Proveedores" },
        { href: "/dashboard", label: "Volver al dashboard" },
      ]}
      actions={
        !hasActive && (
          <Link
            href="/licitaciones/nueva"
            className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Nueva licitación
          </Link>
        )
      }
    >
      <Card>
        {tenders.length === 0 ? (
          <p className="text-sm text-fg-muted">Todavía no publicaste licitaciones.</p>
        ) : (
          <ul className="divide-y divide-border-default">
            {tenders.map((tender) => (
              <li key={tender.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/licitaciones/${tender.id}`} className="text-base font-semibold text-brand-green-700 underline">
                    Licitación N° {tender.number}
                  </Link>
                  <p className="text-sm text-fg-muted">
                    {tender.itemCount} {tender.itemCount === 1 ? "insumo" : "insumos"} · {tender.invitedCount}{" "}
                    {tender.invitedCount === 1 ? "proveedor invitado" : "proveedores invitados"} · del{" "}
                    {formatDateTime(tender.startsAt)} al {formatDateTime(tender.endsAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-fg-muted">
                  {roundLabel(tender.currentRound, tender.roundCount)}
                  <PhaseBadge phase={tender.phase} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageShell>
  );
}
