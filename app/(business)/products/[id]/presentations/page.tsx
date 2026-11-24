import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { toPackagingOptions } from "@/lib/schemas/presentations/presentations";
import { getProductPresentationsService } from "@/lib/services/presentations";
import { listSuppliesService } from "@/lib/services/supplies";
import { PresentationsManager } from "@/components/presentations/presentations-manager";

// P12 "Presentaciones y costo variable" (#298): one product's presentations and
// the variable cost of each one, reached from the products list.
export default async function ProductPresentationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [view, supplies] = await Promise.all([
    getProductPresentationsService(user.id, id),
    listSuppliesService(user.id),
  ]);

  if (!view) notFound();

  return (
    <main className="px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header>
          <Link
            href="/products"
            className="text-sm font-semibold text-link underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            ← Volver a productos
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-fg sm:text-4xl">
            Presentaciones de {view.product.name}
          </h1>
          <p className="mt-2 max-w-xl text-base text-fg-muted">
            Armá cada forma de vender el producto (unidad, caja x6…) con el
            packaging que usa, y mirá su costo variable.
          </p>
        </header>

        <PresentationsManager view={view} packaging={toPackagingOptions(supplies)} />
      </div>
    </main>
  );
}
