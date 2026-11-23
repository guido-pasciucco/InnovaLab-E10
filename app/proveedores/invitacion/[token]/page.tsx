import Link from "next/link";

import { AcceptInviteForm } from "@/components/suppliers/accept-invite-form";
import { SupplierRegistrationForm } from "@/components/suppliers/supplier-registration-form";
import { Card, FormBanner, PageShell } from "@/components/ui/page-shell";
import { getOptionalUser } from "@/lib/auth/optional-user";
import { ERROR_CATALOG } from "@/lib/errors/catalog";
import { getSupplierInviteService, getSupplierService } from "@/lib/services/suppliers";

type InvitePageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Codes the completion route may send back in ?error=. Allowlisted so the
// page never prints arbitrary text from the URL.
const COMPLETION_ERRORS = new Set([
  "SUPPLIER_INVITE_INVALID",
  "SUPPLIER_INVITE_OWN",
  "SUPPLIER_CUIT_TAKEN",
  "VALIDATION",
]);

function completionError(code: string | string[] | undefined): string | null {
  if (typeof code !== "string" || !COMPLETION_ERRORS.has(code)) return null;
  if (code === "VALIDATION") return "Revisá tus datos de proveedor y volvé a enviarlos.";
  return ERROR_CATALOG[code as keyof typeof ERROR_CATALOG].message;
}

// Public landing of a personal invite link (RN-23). Adapts to who opens it:
// a new supplier registers, a signed-in account without supplier data
// completes it, and an existing supplier links one more emprendedor (RN-22).
export default async function SupplierInvitePage({ params, searchParams }: InvitePageProps) {
  const { token } = await params;
  const [invite, user, query] = await Promise.all([
    getSupplierInviteService(token),
    getOptionalUser(),
    searchParams,
  ]);
  const error = completionError(query.error);

  if (invite.status === "invalid") {
    return (
      <PageShell title="Invitación de proveedor" links={[{ href: "/login", label: "Ingresar" }]}>
        <Card>
          <FormBanner message={error ?? ERROR_CATALOG.SUPPLIER_INVITE_INVALID.message} />
        </Card>
      </PageShell>
    );
  }

  const loginHref = `/login?next=${encodeURIComponent(`/proveedores/invitacion/${token}`)}`;
  const supplier = user ? await getSupplierService(user.id) : null;

  return (
    <PageShell
      eyebrow="Invitación de proveedor"
      title={`${invite.ownerName} te invita a sus licitaciones`}
      description="Registrate como proveedor para recibir sus pedidos de precio y ofertar desde tu panel. Tus precios no los ven los demás proveedores."
    >
      <Card>
        <FormBanner message={error} />
        {user && user.id === invite.ownerUserId ? (
          <FormBanner message={ERROR_CATALOG.SUPPLIER_INVITE_OWN.message} />
        ) : supplier ? (
          <AcceptInviteForm token={token} ownerName={invite.ownerName} />
        ) : user ? (
          <SupplierRegistrationForm token={token} ownerName={invite.ownerName} mode="profile" />
        ) : (
          <>
            <p className="text-sm text-fg">
              ¿Ya tenés cuenta de proveedor?{" "}
              <Link href={loginHref} className="font-semibold text-brand-green-700 underline">
                Ingresá con ella
              </Link>{" "}
              y te traemos de vuelta acá para vincularte.
            </p>
            <SupplierRegistrationForm token={token} ownerName={invite.ownerName} mode="signup" />
          </>
        )}
      </Card>
    </PageShell>
  );
}
