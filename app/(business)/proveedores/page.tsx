import Link from "next/link";

import { Card, PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { formatCuit } from "@/lib/schemas/suppliers/cuit";
import { listPublicSuppliersService } from "@/lib/services/suppliers";

// Public supplier registry (issue #309): every registered supplier can see
// every active tender, so the emprendedor no longer keeps a private list,
// generates invite links or selects who to invite when publishing.
export default async function SuppliersPage() {
  await requireUser();
  const suppliers = await listPublicSuppliersService();

  return (
    <PageShell
      eyebrow="Licitaciones"
      title="Proveedores"
      description="Los proveedores se registran por su cuenta, sin invitación. Al publicar una licitación, todos pueden verla y ofertar; tus precios de catálogo y las ofertas de los demás siguen siendo privados."
      actions={
        <Link
          href="/proveedores/registro"
          className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Registrarme como proveedor
        </Link>
      }
    >
      <Card title={`Registro público (${suppliers.length})`} id="proveedores">
        {suppliers.length === 0 ? (
          <p className="text-sm text-fg-muted">Todavía no hay proveedores registrados.</p>
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
    </PageShell>
  );
}
