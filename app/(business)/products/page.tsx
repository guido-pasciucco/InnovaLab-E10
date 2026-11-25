import { requireUser } from "@/lib/auth/require-user";
import { listPresentationNamesByProductService } from "@/lib/services/presentations";
import { listProductsService } from "@/lib/services/products";
import { listSuppliesService } from "@/lib/services/supplies";
import { toRecipeSupplyOptions } from "@/lib/schemas/products/products";
import { ProductsCatalog } from "@/components/products/products-catalog";

// Protected page: session validated server-side, supplies and products filtered
// by user id. Products always come from the server; the client only keeps the
// optimistic list while it stays on this screen.
export default async function ProductsPage() {
  const user = await requireUser();
  const [supplies, products, presentationNames] = await Promise.all([
    listSuppliesService(user.id),
    listProductsService(user.id),
    listPresentationNamesByProductService(user.id),
  ]);

  // Packaging shares the supplies table but is not an ingredient: only
  // kind === "supply" reaches the recipe selector.
  const supplyOptions = toRecipeSupplyOptions(supplies);

  return (
    <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-7">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header>
          <p className="text-xs font-semibold tracking-[0.12em] text-brand-green-700 uppercase">Catálogo</p>
          <h1 className="mt-1 text-[1.625rem] font-bold tracking-[-0.025em] text-fg sm:text-[1.75rem]">Productos</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-fg-muted sm:text-base">
            Ponele nombre a cada producto y armá su receta con los insumos que
            ya cargaste.
          </p>
        </header>

        <ProductsCatalog
          initialProducts={products}
          supplies={supplyOptions}
          presentationNames={presentationNames}
        />
      </div>
    </main>
  );
}
