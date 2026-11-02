import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { businesses, products } from "@/lib/db/business/table";
import { activeCalculations, calculations } from "@/lib/db/calculation/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { uuidString } from "@/lib/db/formats";
import { AppError } from "@/lib/errors/app-error";
import type { CalculationSummary } from "@/lib/types/calculator";

// Calculations the user owns: which one the wizard edits (the "active" one),
// the dashboard list, and the create/reopen operations.
// Owner scoping: every query filters by the caller's userId, and the active
// pointer only counts when it joins to a calculation of that same user.
// The service throws (AppError); doors translate. No try/catch.

// postgres-js transactions expose the same query API as the db client.
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// First owned business wins; created with a sensible default on first use.
export async function getOrCreateDefaultBusiness(tx: Tx, userId: string) {
  const [existing] = await tx
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);

  if (existing) return existing;

  const [created] = await tx
    .insert(businesses)
    .values({ name: "Mi negocio", ownerUserId: userId })
    .returning();
  return created;
}

export type ActiveCalculation = {
  id: string;
  productId: string;
  currentStep: number;
};

/**
 * The calculation every wizard read and write targets: the user's active
 * pointer when it points to one of their own calculations, otherwise their
 * latest draft, otherwise null. A stale or foreign pointer never matches the
 * join, so it falls back silently.
 */
export async function resolveActiveCalculation(
  userId: string,
  db: Db = getDrizzleClient(),
): Promise<ActiveCalculation | null> {
  const [row] = await db
    .select({
      id: calculations.id,
      productId: calculations.productId,
      currentStep: calculations.currentStep,
    })
    .from(calculations)
    .leftJoin(
      activeCalculations,
      sql`${activeCalculations.userId} = ${calculations.userId} and ${activeCalculations.calculationId} = ${calculations.id}`,
    )
    .where(
      sql`${calculations.userId} = ${userId} and (${activeCalculations.calculationId} is not null or ${calculations.status} = 'draft')`,
    )
    .orderBy(
      sql`(${activeCalculations.calculationId} is not null) desc`,
      desc(calculations.createdAt),
      desc(calculations.id),
    )
    .limit(1);

  return row ?? null;
}

async function upsertPointer(tx: Db | Tx, userId: string, calculationId: string) {
  await tx
    .insert(activeCalculations)
    .values({ userId, calculationId })
    .onConflictDoUpdate({
      target: activeCalculations.userId,
      set: { calculationId, updatedAt: new Date() },
    });
}

/**
 * Makes one of the user's calculations the active one. An id that is not a
 * uuid, does not exist or belongs to another user surfaces as the same
 * CALC_NOT_FOUND and changes nothing. Idempotent.
 *
 * @throws AppError CALC_NOT_FOUND
 */
export async function setActiveCalculationService(
  userId: string,
  calculationId: string,
  db: Db = getDrizzleClient(),
): Promise<{ calculationId: string; currentStep: number }> {
  const parsed = uuidString.safeParse(calculationId);
  if (!parsed.success) {
    throw new AppError("CALC_NOT_FOUND");
  }

  const [owned] = await db
    .select({ id: calculations.id, currentStep: calculations.currentStep })
    .from(calculations)
    .where(sql`${calculations.id} = ${parsed.data} and ${calculations.userId} = ${userId}`)
    .limit(1);

  if (!owned) {
    throw new AppError("CALC_NOT_FOUND");
  }

  await upsertPointer(db, userId, owned.id);
  return { calculationId: owned.id, currentStep: owned.currentStep };
}

/**
 * Creates an empty draft (step 1) and makes it active. Other drafts are not
 * touched. The product gets a placeholder name until step 1 is saved.
 */
export async function createCalculationService(
  userId: string,
  db: Db = getDrizzleClient(),
): Promise<{ calculationId: string }> {
  return db.transaction(async (tx) => {
    const business = await getOrCreateDefaultBusiness(tx, userId);
    const [product] = await tx
      .insert(products)
      .values({ name: "Nuevo cálculo", businessId: business.id })
      .returning();
    const [calculation] = await tx
      .insert(calculations)
      .values({ userId, businessId: business.id, productId: product.id, currentStep: 1 })
      .returning();

    await upsertPointer(tx, userId, calculation.id);
    return { calculationId: calculation.id };
  });
}

/** The user's calculations for the dashboard, most recently updated first. */
export async function listUserCalculationsService(
  userId: string,
  db: Db = getDrizzleClient(),
): Promise<CalculationSummary[]> {
  const rows = await db
    .select({
      id: calculations.id,
      productName: products.name,
      status: calculations.status,
      currentStep: calculations.currentStep,
      updatedAt: calculations.updatedAt,
      activeId: activeCalculations.calculationId,
    })
    .from(calculations)
    .innerJoin(products, eq(calculations.productId, products.id))
    .leftJoin(
      activeCalculations,
      sql`${activeCalculations.userId} = ${calculations.userId} and ${activeCalculations.calculationId} = ${calculations.id}`,
    )
    .where(eq(calculations.userId, userId))
    .orderBy(desc(calculations.updatedAt), desc(calculations.id));

  return rows.map(({ activeId, ...row }) => ({ ...row, isActive: activeId !== null }));
}
