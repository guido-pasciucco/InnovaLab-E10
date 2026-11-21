import { requireUser } from "@/lib/auth/require-user";
import { listSuppliesService } from "@/lib/services/supplies";
import { SuppliesCatalog } from "@/components/supplies/supplies-catalog";

// Protected page: session validated server-side, data filtered by user id.
export default async function SuppliesPage() {
  const user = await requireUser();
  const supplies = await listSuppliesService(user.id);

  return (
    <main className="px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-fg sm:text-4xl">Insumos y packaging</h1>
          <p className="mt-2 max-w-xl text-base text-fg-muted">
            Anotá cada insumo y packaging con el precio, la cantidad y la unidad de medida.
          </p>
        </header>

        <SuppliesCatalog supplies={supplies} />
      </div>
    </main>
  );
}
