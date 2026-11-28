import Link from "next/link";

import { formatDateTime } from "@/components/tenders/format";
import { PhaseBadge, roundLabel } from "@/components/tenders/phase-badge";
import { Card, PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { TenderNotices } from "@/components/tenders/notices";
import { listTenderDraftsService } from "@/lib/services/tender-drafts";
import { listTenderNoticesService, listTendersService } from "@/lib/services/tenders";

// The emprendedor's tenders, newest first. Each draft has its own link so the
// emprendedor chooses which one to continue (N-31). Data filtered by session.
export default async function TendersPage() {
  const user = await requireUser();
  const [tenders, notices, drafts] = await Promise.all([
    listTendersService(user.id),
    listTenderNoticesService(user.id),
    listTenderDraftsService(user.id),
  ]);

  return (
    <PageShell
      eyebrow="Compras de insumos"
      title="Licitaciones"
      description="Publicá una compra y tus proveedores compiten por rondas, sin conocerse entre sí. Vos decidís a quién le comprás."
      actions={
        // Always open: a draft can be prepared while another tender runs.
        <Link
          href="/licitaciones/nueva"
          className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Nueva licitación
        </Link>
      }
    >
      <TenderNotices notices={notices} />
      {drafts.length > 0 && (
        <section className="space-y-3" aria-labelledby="borradores">
          <h2 id="borradores" className="text-lg font-bold text-fg">
            Borradores
          </h2>
          <Card>
            <ul className="divide-y divide-border-default">
              {drafts.map((draft) => (
                <li key={draft.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link
                      href={`/licitaciones/nueva?borrador=${draft.id}`}
                      className="text-base font-semibold text-brand-green-700 underline"
                    >
                      Continuar borrador N° {draft.number}
                    </Link>
                    <p className="text-sm text-fg-muted">
                      {draft.itemCount} {draft.itemCount === 1 ? "insumo" : "insumos"} · guardado el{" "}
                      {formatDateTime(draft.updatedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
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
