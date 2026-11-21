import Link from "next/link";

import LogoutButton from "@/app/dashboard/logout-button";
import { formatDateTime } from "@/components/tenders/format";
import { PhaseBadge, roundLabel } from "@/components/tenders/phase-badge";
import { Card, PageShell } from "@/components/ui/page-shell";
import { requireSupplier } from "@/lib/auth/require-supplier";
import { formatCuit } from "@/lib/schemas/suppliers/cuit";
import { listSupplierEmprendedoresService } from "@/lib/services/suppliers";
import { listSupplierTendersService, type SupplierTenderSummary } from "@/lib/services/tenders";

// Supplier panel ("dashboard unificado", annex 03): the tenders of every
// emprendedor the supplier is linked to, grouped by emprendedor (RN-22). It
// never opens the emprendedor's calculator or catalog (RN-07).
export default async function SupplierPanelPage() {
  const { user, supplier } = await requireSupplier();
  const [emprendedores, tenders] = await Promise.all([
    listSupplierEmprendedoresService(user.id),
    listSupplierTendersService(user.id),
  ]);

  const tendersByOwner = new Map<string, SupplierTenderSummary[]>();
  for (const tender of tenders) {
    tendersByOwner.set(tender.ownerUserId, [...(tendersByOwner.get(tender.ownerUserId) ?? []), tender]);
  }

  return (
    <PageShell
      eyebrow={`${supplier.businessName} · CUIT ${formatCuit(supplier.cuit)}`}
      title="Panel de proveedor"
      description="Acá ves las licitaciones de los emprendedores que te invitaron y todos sus avisos."
      actions={<LogoutButton />}
    >
      {emprendedores.length === 0 && (
        <Card>
          <p className="text-sm text-fg-muted">Todavía no estás vinculado con ningún emprendedor.</p>
        </Card>
      )}
      {emprendedores.map((emprendedor) => {
        const own = tendersByOwner.get(emprendedor.ownerUserId) ?? [];
        return (
          <Card key={emprendedor.ownerUserId} title={emprendedor.ownerName} id={`emp-${emprendedor.ownerUserId}`}>
            {own.length === 0 ? (
              <p className="text-sm text-fg-muted">Todavía no te invitó a ninguna licitación.</p>
            ) : (
              <ul className="divide-y divide-border-default">
                {own.map((tender) => (
                  <li key={tender.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Link
                        href={`/proveedor/licitaciones/${tender.id}`}
                        className="text-base font-semibold text-brand-green-700 underline"
                      >
                        Licitación N° {tender.number}
                      </Link>
                      <p className="text-sm text-fg-muted">
                        Del {formatDateTime(tender.startsAt)} al {formatDateTime(tender.endsAt)}
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
        );
      })}
    </PageShell>
  );
}
