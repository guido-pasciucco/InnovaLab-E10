import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { getProfileSummaryService } from "@/lib/services/profile";
import { getHomePathService } from "@/lib/services/suppliers";
import LogoutButton from "./logout-button";

// Protected page: the session is validated server-side (requireUser) and every
// piece of data below is read from the DB, filtered by the session user id.
export default async function DashboardPage() {
  const user = await requireUser();
  // A supplier account without a business of its own belongs in the supplier
  // panel (docs/licitaciones, annex 03), not in the emprendedor dashboard.
  if ((await getHomePathService(user.id)) === "/proveedor") redirect("/proveedor");
  const profile = await getProfileSummaryService(user.id);
  const initial = (profile.displayName ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-surface-tint px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-fg sm:text-4xl">Dashboard</h1>
            <p className="mt-2 max-w-xl text-base text-fg-muted">
              Administrá tus insumos, productos y gastos del negocio.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-[14px] px-5 py-2 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Volver al inicio
            </Link>
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Mis productos
            </Link>
          </div>
        </header>

        <section
          aria-label="Perfil"
          className="flex items-center justify-between gap-4 rounded-3xl bg-surface p-5 shadow-sm"
        >
          <div className="flex min-w-0 items-center gap-4">
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-green-50 text-lg font-bold text-brand-green-700"
              aria-hidden="true"
            >
              {initial}
            </span>
            <dl className="min-w-0 text-sm">
              {profile.displayName && (
                <div className="flex gap-2">
                  <dt className="font-medium text-fg-muted">Nombre:</dt>
                  <dd className="truncate text-fg">{profile.displayName}</dd>
                </div>
              )}
              {user.email && (
                <div className="flex gap-2">
                  <dt className="font-medium text-fg-muted">Email:</dt>
                  <dd className="truncate text-fg">{user.email}</dd>
                </div>
              )}
            </dl>
          </div>
          <LogoutButton />
        </section>

        <section aria-label="Accesos" className="grid gap-4 sm:grid-cols-3">
          {[
            { href: "/insumos", label: "Insumos", hint: "Catálogo de compras y packaging" },
            { href: "/products", label: "Productos", hint: "Recetas y presentaciones" },
            { href: "/period-costs", label: "Gastos del período", hint: "Costos fijos del mes" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl bg-surface p-5 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <p className="text-lg font-semibold text-fg">{item.label}</p>
              <p className="mt-2 text-sm text-fg-muted">{item.hint}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
