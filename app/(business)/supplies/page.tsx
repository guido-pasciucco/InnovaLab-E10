import { requireUser } from "@/lib/auth/require-user";
import { listSuppliesService } from "@/lib/services/supplies";
import { SuppliesCatalog } from "@/components/supplies/supplies-catalog";

// Protected page: session validated server-side, data filtered by user id.
export default async function SuppliesPage() {
  const user = await requireUser();
  const supplies = await listSuppliesService(user.id);

  return (
    <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-7">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header>
          <p className="text-xs font-semibold tracking-[0.12em] text-brand-green-700 uppercase">Catálogo</p>
          <h1 className="mt-1 text-[1.625rem] font-bold tracking-[-0.025em] text-fg sm:text-[1.75rem]">Insumos y packaging</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-fg-muted sm:text-base">
            Anotá cada insumo y packaging con el precio, la cantidad y la unidad de medida.
          </p>
        </header>

        <SuppliesCatalog supplies={supplies} />
      </div>
    </main>
  );
}
