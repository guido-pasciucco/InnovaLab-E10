import Link from "next/link";

import { SupplierRegistrationForm } from "@/components/suppliers/supplier-registration-form";
import { Card, FormBanner, PageShell } from "@/components/ui/page-shell";
import { getOptionalUser } from "@/lib/auth/optional-user";
import { ERROR_CATALOG } from "@/lib/errors/catalog";
import { getSupplierService } from "@/lib/services/suppliers";

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Codes the completion route may send back in ?error=. Allowlisted so the
// page never prints arbitrary text from the URL.
const COMPLETION_ERRORS = new Set([
  "SUPPLIER_CUIT_TAKEN",
  "SUPPLIER_ALREADY_REGISTERED",
  "VALIDATION",
  "UNAUTHORIZED",
]);

function completionError(code: string | string[] | undefined): string | null {
  if (typeof code !== "string" || !COMPLETION_ERRORS.has(code)) return null;
  if (code === "VALIDATION") return "Revisá tus datos de proveedor y volvé a enviarlos.";
  return ERROR_CATALOG[code as keyof typeof ERROR_CATALOG].message;
}

// Public supplier registration (issue #309): anyone signs up with the same
// data, CUIT validation and email confirmation as before, without an
// invitation. A signed-in account without supplier data only completes it.
export default async function SupplierRegisterPage({ searchParams }: RegisterPageProps) {
  const [user, query] = await Promise.all([getOptionalUser(), searchParams]);
  const error = completionError(query.error);
  const supplier = user ? await getSupplierService(user.id) : null;

  return (
    <PageShell
      eyebrow="Proveedores"
      title="Registrate como proveedor"
      description="Creá tu cuenta para ver todas las licitaciones activas y ofertar desde tu panel. No hace falta que nadie te invite: tus precios no los ven los demás proveedores."
    >
      <Card>
        <FormBanner message={error} />
        {supplier ? (
          <div className="space-y-3 text-sm text-fg">
            <p>Tu cuenta ya está registrada como proveedor.</p>
            <Link href="/proveedor" className="font-semibold text-brand-green-700 underline">
              Ir a mi panel de proveedor
            </Link>
          </div>
        ) : (
          <>
            {user ? (
              <p className="text-sm text-fg-muted">
                Tu cuenta ya existe: completá los datos de proveedor para acceder al panel.
              </p>
            ) : (
              <p className="text-sm text-fg">
                ¿Ya tenés cuenta?{" "}
                <Link
                  href={`/login?next=${encodeURIComponent("/proveedores/registro")}`}
                  className="font-semibold text-brand-green-700 underline"
                >
                  Ingresá con ella
                </Link>{" "}
                y completá tus datos de proveedor.
              </p>
            )}
            <SupplierRegistrationForm mode={user ? "profile" : "signup"} />
          </>
        )}
      </Card>
    </PageShell>
  );
}
