import LogoutButton from "@/app/dashboard/logout-button";
import { Card, PageShell } from "@/components/ui/page-shell";
import { requireSupplier } from "@/lib/auth/require-supplier";
import { formatCuit } from "@/lib/schemas/suppliers/cuit";
import { listSupplierEmprendedoresService } from "@/lib/services/suppliers";

// Supplier panel ("dashboard unificado", annex 03): the emprendedores the
// supplier is linked to (RN-22). It never opens the emprendedor's calculator
// or catalog (RN-07).
export default async function SupplierPanelPage() {
  const { user, supplier } = await requireSupplier();
  const emprendedores = await listSupplierEmprendedoresService(user.id);

  return (
    <PageShell
      eyebrow={`${supplier.businessName} · CUIT ${formatCuit(supplier.cuit)}`}
      title="Panel de proveedor"
      description="Acá ves las licitaciones de los emprendedores que te invitaron y todos sus avisos."
      actions={<LogoutButton />}
    >
      <Card title="Emprendedores con los que trabajás" id="emprendedores">
        {emprendedores.length === 0 ? (
          <p className="text-sm text-fg-muted">Todavía no estás vinculado con ningún emprendedor.</p>
        ) : (
          <ul className="divide-y divide-border-default">
            {emprendedores.map((e) => (
              <li key={e.ownerUserId} className="py-2 text-sm font-semibold text-fg">
                {e.ownerName}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageShell>
  );
}
