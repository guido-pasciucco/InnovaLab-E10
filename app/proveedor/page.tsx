import Link from "next/link";

import LogoutButton from "@/components/auth/logout-button";
import { SupplierNotices } from "@/components/tenders/notices";
import { formatDateTime } from "@/components/tenders/format";
import { PhaseBadge, roundLabel } from "@/components/tenders/phase-badge";
import { Card, PageShell } from "@/components/ui/page-shell";
import { requireSupplier } from "@/lib/auth/require-supplier";
import { formatCuit } from "@/lib/schemas/suppliers/cuit";
import { listSupplierNoticesService, listSupplierTendersService } from "@/lib/services/tenders";

// Supplier panel: every active tender is visible to every registered supplier
// (issue #309), plus the closed and cancelled ones it took part in. It never
// opens the emprendedor's calculator or catalog (RN-07).
export default async function SupplierPanelPage() {
  const { user, supplier } = await requireSupplier();
  const [tenders, notices] = await Promise.all([
    listSupplierTendersService(user.id),
    listSupplierNoticesService(user.id),
  ]);

  return (
    <PageShell
      eyebrow={`${supplier.businessName} · CUIT ${formatCuit(supplier.cuit)}`}
      title="Panel de proveedor"
      description="Acá ves todas las licitaciones activas y tus avisos. Tus ofertas son privadas: nadie más las ve."
      actions={<LogoutButton />}
    >
      <SupplierNotices notices={notices} />
      <Card title={`Licitaciones (${tenders.length})`}>
        {tenders.length === 0 ? (
          <p className="text-sm text-fg-muted">Todavía no hay licitaciones activas.</p>
        ) : (
          <ul className="divide-y divide-border-default">
            {tenders.map((tender) => (
              <li key={tender.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link
                    href={`/proveedor/licitaciones/${tender.id}`}
                    className="text-base font-semibold text-brand-green-700 underline"
                  >
                    Licitación N° {tender.number}
                  </Link>
                  <p className="text-sm text-fg-muted">
                    {tender.ownerName} · Del {formatDateTime(tender.startsAt)} al {formatDateTime(tender.endsAt)}
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
