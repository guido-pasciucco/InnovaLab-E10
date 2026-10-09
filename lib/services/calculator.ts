import "server-only";

import { and, eq } from "drizzle-orm";

import { businesses, products } from "@/lib/db/business/table";
import { calculations, costingSetup } from "@/lib/db/calculation/table";
import {
  saveCalculatorSetupInputSchema,
  type SaveCalculatorSetupInput,
} from "@/lib/db/calculation/validation";
import { getDrizzleClient, type Db } from "@/lib/db/client";

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
    .limit(1);

  return row ? saveCalculatorSetupInputSchema.parse(row) : null;
}
