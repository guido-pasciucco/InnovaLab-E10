import type { AnalystView } from "@/lib/analyst/views";
import type { Db } from "@/lib/db/client";
import { businesses, presentationPackaging, presentations, productIngredients, products } from "@/lib/db/business/table";
import { businessCostLines } from "@/lib/db/costs/table";
import { supplies } from "@/lib/db/supplies/table";

// Seeds exactly one row per `analyst` view for a user, so tests can compare ids
// and rows-per-view precisely. Writes through Drizzle (role `postgres`), the
// way the services do. Deleting the user cascades to all of it.

export type SeededAnalystData = {
  businessId: string;
  // Row id each view must return for this user.
  ids: Record<AnalystView, string>;
};

export async function seedAnalystData(db: Db, userId: string, label: string): Promise<SeededAnalystData> {
  const [business] = await db
    .insert(businesses)
    .values({ ownerUserId: userId, name: `Negocio ${label}` })
    .returning({ id: businesses.id });
  const [product] = await db
    .insert(products)
    .values({ businessId: business.id, name: `Producto ${label}` })
    .returning({ id: products.id });
  const [supply] = await db
    .insert(supplies)
    .values({ userId, name: `Insumo ${label}`, purchasePrice: "100.00" })
    .returning({ id: supplies.id });
  const [recipeLine] = await db
    .insert(productIngredients)
    .values({ productId: product.id, supplyId: supply.id, unit: "unidad", quantity: "2" })
    .returning({ id: productIngredients.id });
  const [expense] = await db
    .insert(businessCostLines)
    .values({
      businessId: business.id,
      period: "2026-11",
      concept: `Alquiler ${label}`,
      behavior: "fixed",
      traceability: "indirect",
      amountPeriod: "1000.00",
    })
    .returning({ id: businessCostLines.id });
  const [presentation] = await db
    .insert(presentations)
    .values({ productId: product.id, name: `Caja ${label}`, unitsPerPresentation: "6" })
    .returning({ id: presentations.id });
  const [packaging] = await db
    .insert(presentationPackaging)
    .values({ presentationId: presentation.id, supplyId: supply.id, unit: "unidad", quantity: "1" })
    .returning({ id: presentationPackaging.id });

  return {
    businessId: business.id,
    ids: {
      products: product.id,
      supplies: supply.id,
      recipe_lines: recipeLine.id,
      business_expenses: expense.id,
      presentations: presentation.id,
      presentation_packaging: packaging.id,
    },
  };
}

// Extra monthly expenses for one business, to test row limits and timeouts.
export async function seedExpenses(db: Db, businessId: string, count: number): Promise<void> {
  await db.insert(businessCostLines).values(
    Array.from({ length: count }, (_, index) => ({
      businessId,
      period: "2026-10",
      concept: `Gasto ${index}`,
      behavior: "fixed",
      traceability: "indirect",
      amountPeriod: "10.00",
    })),
  );
}
