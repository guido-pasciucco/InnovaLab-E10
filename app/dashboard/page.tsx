import { CalculationList, NewCalculationButton } from "@/components/dashboard/calculation-list";
import { TOTAL_STEPS } from "@/components/calculator/wizard/wizard-steps";
import { requireUser } from "@/lib/auth/require-user";
import { listUserCalculationsService } from "@/lib/services/calculations";
import { getProfileSummaryService } from "@/lib/services/profile";
import LogoutButton from "./logout-button";

const dateFormat = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[24px] bg-surface p-5 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">{label}</p>
      <p className="mt-3 text-3xl font-bold text-fg">{value}</p>
      {hint && <p className="mt-2 text-sm text-fg-muted">{hint}</p>}
    </div>
  );
}

// Protected page: the session is validated server-side (requireUser) and every
// piece of data below is read from the DB, filtered by the session user id.
export default async function DashboardPage() {
  const user = await requireUser();
  const [profile, calculations] = await Promise.all([
    getProfileSummaryService(user.id),
    listUserCalculationsService(user.id),
  ]);

  const furthest = calculations.reduce((max, c) => Math.max(max, c.currentStep), 0);
  const latest = calculations[0];
  const initial = (profile.displayName ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-surface-tint px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-fg sm:text-4xl">Dashboard</h1>
            <p className="mt-2 max-w-xl text-base text-fg-muted">
              Retomá tus cálculos donde los dejaste o empezá uno nuevo.
            </p>
          </div>
          <NewCalculationButton />
        </header>

        <section
          aria-label="Perfil"
          className="flex items-center justify-between gap-4 rounded-[24px] bg-surface p-5 shadow-sm"
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

        <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total de cálculos"
            value={String(calculations.length)}
            hint="Guardados en tu cuenta"
          />
          <StatCard
            label="Avance más alto"
            value={furthest > 0 ? `Paso ${furthest} de ${TOTAL_STEPS}` : "—"}
            hint={furthest > 0 ? "Entre todos tus cálculos" : "Todavía sin cálculos"}
          />
          <div className="rounded-[24px] bg-action-primary-pressed p-5 text-white shadow-sm">
            <p className="text-xs font-semibold tracking-wide uppercase opacity-80">
              Último cálculo
            </p>
            <p className="mt-3 truncate text-2xl font-bold">
              {latest ? latest.productName : "—"}
            </p>
            <p className="mt-2 text-sm opacity-80">
              {latest ? `Actualizado ${dateFormat.format(latest.updatedAt)}` : "Empezá uno nuevo"}
            </p>
          </div>
        </section>

        <section aria-label="Mis cálculos">
          <h2 className="mb-3 text-lg font-semibold text-fg">Mis cálculos</h2>
          <CalculationList items={calculations} />
        </section>
      </div>
    </main>
  );
}
