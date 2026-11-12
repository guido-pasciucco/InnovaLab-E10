import { requireUser } from "@/lib/auth/require-user";
import { getUserDefaultBusiness, listSuppliesService } from "@/lib/services/supplies";
import { getProfileSummaryService } from "@/lib/services/profile";
import { SuppliesCatalog } from "@/components/supplies/supplies-catalog";

// Protected page: session validated server-side, data filtered by user id.
export default async function SuppliesPage() {
  const user = await requireUser();
  const [profile, business, supplies] = await Promise.all([
    getProfileSummaryService(user.id),
    getUserDefaultBusiness(user.id),
    listSuppliesService(user.id),
  ]);

  const userName = profile.displayName ?? user.email ?? "";
  const businessName = business?.name ?? "";

  return (
    <main className="min-h-screen bg-surface-tint px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brand-green-700 uppercase">
              {businessName && `${businessName} · `}
              {userName}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-fg sm:text-4xl">
              Insumos y packaging
            </h1>
            <p className="mt-2 max-w-xl text-base text-fg-muted">
              Anotá cada insumo y packaging con el precio y la unidad de compra.
            </p>
          </div>
        </header>

        <SuppliesCatalog supplies={supplies} />
      </div>
    </main>
  );
}
