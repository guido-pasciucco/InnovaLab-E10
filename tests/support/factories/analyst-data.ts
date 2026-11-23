import type { AnalystView } from "@/lib/analyst/views";
import type { Db } from "@/lib/db/client";
import { businesses, productIngredients, products } from "@/lib/db/business/table";
import { calculations, costingSetup, pricingInputs, scenarios } from "@/lib/db/calculation/table";
import { businessCostLines, calcCostLines } from "@/lib/db/costs/table";
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
  const [calculation] = await db
    .insert(calculations)
    .values({ userId, businessId: business.id, productId: product.id })
    .returning({ id: calculations.id });
  await db.insert(costingSetup).values({
    calculationId: calculation.id,
    currency: "ARS",
    period: "Mensual",
    unit: "caja",
    volume: 10,
  });
  await db.insert(pricingInputs).values({
    calculationId: calculation.id,
    marginConvention: "sobre_precio",
    expectedMarginPct: "30",
  });
  const [costLine] = await db
    .insert(calcCostLines)
    .values({
      calculationId: calculation.id,
      concept: `Costo ${label}`,
      behavior: "variable",
      traceability: "direct",
      amount: "50.00",
    })
    .returning({ id: calcCostLines.id });
  const [scenario] = await db
    .insert(scenarios)
    .values({ calculationId: calculation.id, name: `Escenario ${label}`, isBase: true })
    .returning({ id: scenarios.id });

  return {
    businessId: business.id,
    ids: {
      products: product.id,
      supplies: supply.id,
      recipe_lines: recipeLine.id,
      business_expenses: expense.id,
      calculations: calculation.id,
      calculation_cost_lines: costLine.id,
      scenarios: scenario.id,
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
