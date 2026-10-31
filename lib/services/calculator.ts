import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { businesses, products } from "@/lib/db/business/table";
import { calculations, costingSetup } from "@/lib/db/calculation/table";
import {
  saveCalculatorSetupInputSchema,
  type SaveCalculatorSetupInput,
} from "@/lib/db/calculation/validation";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import type { CalculatorDraftSetup } from "@/lib/types/calculator";

// Calculator setup persistence (ADR 0005: the draft lives server-side only).
// Input is validated with the server gate from lib/db (saveCalculatorSetupInputSchema),
// never with the client form contract.
// Owner scoping: every query and write filters by the caller's userId.
// The service throws (ZodError, AppError); doors translate. No try/catch.

// postgres-js transactions expose the same query API as the db client.
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// First owned business wins; created with a sensible default on first save.
async function getOrCreateDefaultBusiness(tx: Tx, userId: string) {
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

export async function getDraftCalculationId(
  userId: string,
  db: Db,
): Promise<string | null> {
  const [row] = await db
    .select({ id: calculations.id })
    .from(calculations)
    .where(and(eq(calculations.userId, userId), eq(calculations.status, "draft")))
    // #123 will make the draft unique. Until then, the order keeps every
    // read/write on the same row even if duplicates already exist.
    .orderBy(desc(calculations.createdAt), desc(calculations.id))
    .limit(1);
  return row?.id ?? null;
}

export async function saveCalculatorSetupService(
  userId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<SaveCalculatorSetupInput> {
  const setup = saveCalculatorSetupInputSchema.parse(input);

  return db.transaction(async (tx) => {
    const business = await getOrCreateDefaultBusiness(tx, userId);

    const [draft] = await tx
      .select({ id: calculations.id, productId: calculations.productId })
      .from(calculations)
      .where(and(eq(calculations.userId, userId), eq(calculations.status, "draft")))
      .orderBy(desc(calculations.createdAt), desc(calculations.id))
      .limit(1);

    let calculationId: string;

    if (draft) {
      await tx
        .update(products)
        .set({ name: setup.name })
        .where(and(eq(products.id, draft.productId), eq(products.businessId, business.id)));
      calculationId = draft.id;
    } else {
      const [product] = await tx
        .insert(products)
        .values({ name: setup.name, businessId: business.id })
        .returning();
      const [calculation] = await tx
        .insert(calculations)
        .values({ userId, businessId: business.id, productId: product.id })
        .returning();
      calculationId = calculation.id;
    }

    await tx
      .insert(costingSetup)
      .values({
        calculationId,
        unit: setup.unit,
        volume: setup.volume,
        currency: setup.currency,
        period: setup.period,
      })
      .onConflictDoUpdate({
        target: costingSetup.calculationId,
        set: {
          unit: setup.unit,
          volume: setup.volume,
          currency: setup.currency,
          period: setup.period,
          updatedAt: new Date(),
        },
      });

    return setup;
  });
}

export async function getCalculatorSetupService(
  userId: string,
  db: Db = getDrizzleClient(),
): Promise<SaveCalculatorSetupInput | null> {
  const [row] = await db
    .select({
      name: products.name,
      unit: costingSetup.unit,
      volume: costingSetup.volume,
      currency: costingSetup.currency,
      period: costingSetup.period,
    })
    .from(costingSetup)
    .innerJoin(calculations, eq(costingSetup.calculationId, calculations.id))
    .innerJoin(products, eq(calculations.productId, products.id))
    .where(and(eq(calculations.userId, userId), eq(calculations.status, "draft")))
    .orderBy(desc(calculations.createdAt), desc(calculations.id))
    .limit(1);

  return row ? saveCalculatorSetupInputSchema.parse(row) : null;
}

/**
 * Read model for the step 1 form: the draft the user is editing and its
 * persisted setup. It never writes.
 *
 * Null semantics:
 * - no draft: `calculationId` and `setup` are null.
 * - draft without a `costing_setup` row: `calculationId` is returned so the
 *   form can still save to that draft, and `setup` is null.
 * - draft with setup: both values are returned.
 */
export async function getCalculatorDraftSetupService(
  userId: string,
  db: Db = getDrizzleClient(),
): Promise<CalculatorDraftSetup> {
  const [draft] = await db
    .select({
      calculationId: calculations.id,
      name: products.name,
      unit: costingSetup.unit,
      volume: costingSetup.volume,
      currency: costingSetup.currency,
      period: costingSetup.period,
    })
    .from(calculations)
    .innerJoin(products, eq(calculations.productId, products.id))
    .leftJoin(costingSetup, eq(costingSetup.calculationId, calculations.id))
    .where(and(eq(calculations.userId, userId), eq(calculations.status, "draft")))
    // #123 owns the unique-draft fix; ordering here keeps this read
    // deterministic even before that migration lands.
    .orderBy(desc(calculations.createdAt), desc(calculations.id))
    .limit(1);

  if (!draft) {
    return { calculationId: null, setup: null };
  }

  if (
    draft.unit === null ||
    draft.volume === null ||
    draft.currency === null ||
    draft.period === null
  ) {
    return { calculationId: draft.calculationId, setup: null };
  }

  return {
    calculationId: draft.calculationId,
    setup: saveCalculatorSetupInputSchema.parse({
      name: draft.name,
      unit: draft.unit,
      volume: draft.volume,
      currency: draft.currency,
      period: draft.period,
    }),
  };
}
