import { InviteLinkForm } from "@/components/suppliers/invite-link-form";
import { formatDateTime } from "@/components/tenders/format";
import { Card, PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { formatCuit } from "@/lib/schemas/suppliers/cuit";
import {
  listLinkedSuppliersService,
  listSupplierInvitesService,
  type SupplierInviteStatus,
} from "@/lib/services/suppliers";

const STATUS_LABEL: Record<SupplierInviteStatus, string> = {
  pending: "Sin usar",
  used: "Usado",
  expired: "Vencido",
};

// The emprendedor's suppliers (RN-05, RN-22, RN-23): the ones linked to them
// and the personal links they generated. Data filtered by the session user.
export default async function SuppliersPage() {
  const user = await requireUser();
  const [suppliers, invites] = await Promise.all([
    listLinkedSuppliersService(user.id),
    listSupplierInvitesService(user.id),
  ]);

  return (
    <PageShell
      eyebrow="Licitaciones"
      title="Proveedores"
      description="Invitá a tus proveedores con un enlace personal. Solo los proveedores registrados con vos pueden participar en tus licitaciones."
    >
      <Card title="Invitar a un proveedor" id="invitar">
        <p className="text-sm text-fg-muted">
          Generá un enlace por proveedor y mandáselo por WhatsApp, mail o el medio que prefieras. Sirve una sola vez
          y vence a los 7 días. Si ya tiene cuenta de proveedor, entra con ella y queda vinculado con vos.
        </p>
        <InviteLinkForm />
      </Card>

      <Card title={`Tus proveedores (${suppliers.length})`} id="proveedores">
        {suppliers.length === 0 ? (
          <p className="text-sm text-fg-muted">Todavía no tenés proveedores registrados.</p>
        ) : (
          <ul className="divide-y divide-border-default">
            {suppliers.map((supplier) => (
              <li key={supplier.userId} className="py-3 text-sm">
                <p className="font-semibold text-fg">{supplier.businessName}</p>
                <p className="text-fg-muted">
                  CUIT {formatCuit(supplier.cuit)} · {supplier.contactName} · {supplier.phone} · {supplier.email}
                </p>
                <p className="text-fg-muted">Rubros: {supplier.categories.join(", ")}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Enlaces generados" id="enlaces">
        {invites.length === 0 ? (
          <p className="text-sm text-fg-muted">Todavía no generaste enlaces.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-fg-muted">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">Para</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Generado</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Vence</th>
                  <th scope="col" className="py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="py-2 pr-4 text-fg">{invite.label}</td>
                    <td className="py-2 pr-4 text-fg-muted">{formatDateTime(invite.createdAt)}</td>
                    <td className="py-2 pr-4 text-fg-muted">{formatDateTime(invite.expiresAt)}</td>
                    <td className="py-2 text-fg">
                      {STATUS_LABEL[invite.status]}
                      {invite.supplierBusinessName && ` por ${invite.supplierBusinessName}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
