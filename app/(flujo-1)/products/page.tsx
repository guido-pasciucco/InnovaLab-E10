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
    <main className="px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-fg sm:text-4xl">Productos</h1>
          <p className="mt-2 max-w-xl text-base text-fg-muted">
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
