import { CalculationList } from "@/components/dashboard/calculation-list";
import { requireUser } from "@/lib/auth/require-user";
import { listUserCalculationsService } from "@/lib/services/calculations";
import { getProfileSummaryService } from "@/lib/services/profile";
import LogoutButton from "./logout-button";

// Protected page: the session is validated server-side (requireUser) and every
// piece of data below is read from the DB, filtered by the session user id.
export default async function DashboardPage() {
  const user = await requireUser();
  const [profile, calculations] = await Promise.all([
    getProfileSummaryService(user.id),
    listUserCalculationsService(user.id),
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center bg-surface-tint px-4 py-12">
      <div className="w-full max-w-2xl rounded-lg bg-surface p-8 shadow-md">
        <h1 className="text-2xl font-bold text-fg">Dashboard</h1>

        <dl className="mt-4 space-y-1 text-sm">
          {profile.displayName && (
            <div className="flex gap-2">
              <dt className="font-medium text-fg-muted">Nombre:</dt>
              <dd className="text-fg">{profile.displayName}</dd>
            </div>
          )}
          {user.email && (
            <div className="flex gap-2">
              <dt className="font-medium text-fg-muted">Email:</dt>
              <dd className="text-fg">{user.email}</dd>
            </div>
          )}
        </dl>

        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-fg">Mis cálculos</h2>
          <CalculationList items={calculations} />
        </section>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
