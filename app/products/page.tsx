import Link from "next/link";

import { requireUser } from "@/lib/auth/require-user";
import { getProfileSummaryService } from "@/lib/services/profile";
import { getUserDefaultBusiness, listSuppliesService } from "@/lib/services/supplies";
import { toRecipeSupplyOptions } from "@/lib/schemas/products/products";
import { ProductsCatalog } from "@/components/products/products-catalog";

// Protected page: session validated server-side, supplies filtered by user id.
// Products still have no persistence service (issue #240 backend), so the
// catalog starts empty and the client keeps the preview state. When the
// service lands, replace `initialProducts` with its result.
export default async function ProductsPage() {
  const user = await requireUser();
  const [profile, business, supplies] = await Promise.all([
    getProfileSummaryService(user.id),
    getUserDefaultBusiness(user.id),
    listSuppliesService(user.id),
  ]);

  const userName = profile.displayName ?? user.email ?? "";
  const businessName = business?.name ?? "";
  // Packaging shares the supplies table but is not an ingredient: only
  // kind === "supply" reaches the recipe selector.
  const supplyOptions = toRecipeSupplyOptions(supplies);

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
              Productos
            </h1>
            <p className="mt-2 max-w-xl text-base text-fg-muted">
              Ponele nombre a cada producto y armá su receta con los insumos que
              ya cargaste.
            </p>
          </div>

          <Link
            href="/supplies"
            className="inline-flex min-h-11 items-center justify-center self-start rounded-[14px] border border-border-control bg-surface px-5 py-2 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Catálogo de insumos
          </Link>
        </header>

        <ProductsCatalog initialProducts={[]} supplies={supplyOptions} />
      </div>
    </main>
  );
}
