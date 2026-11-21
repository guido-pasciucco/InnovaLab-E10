import "server-only";

import { and, eq, exists, gt, isNull, or, sql } from "drizzle-orm";

import { businesses, productIngredients, products } from "@/lib/db/business/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import type { VerifiedUserId } from "@/lib/services/auth";
import { lockVariableCostSupplies, runVariableCostTransaction } from "./variable-cost-transaction";
import { recalculatePersistedProductVariableCostsTx } from "./products";

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 200;

export type ProductVariableCostBackfillOptions = {
  batchSize?: number;
  afterProductId?: string;
  /** Limits an operational run to one business; useful for a safe retry. */
  businessId?: string;
};

export type ProductVariableCostBackfillResult = {
  processed: number;
  nextAfterProductId: string | null;
};

/**
 * Explicit, resumable backfill. Legacy products without a yield become the
 * typed `MISSING_YIELD` state: assigning a default would fabricate a cost.
 * Rows with a yield but no persisted recipe stay pending until their source
 * data is complete, so they are not selected repeatedly. Successful rows
 * leave `pending` for `ready` or a typed `unavailable` state; no historical
 * calculation rows are touched.
 */
export async function backfillProductVariableCosts(
  options: ProductVariableCostBackfillOptions = {},
  db: Db = getDrizzleClient(),
): Promise<ProductVariableCostBackfillResult> {
  const batchSize = Math.min(Math.max(options.batchSize ?? DEFAULT_BATCH_SIZE, 1), MAX_BATCH_SIZE);
  const conditions = [
    eq(products.variableCostStatus, "pending"),
    eq(products.isActive, true),
    or(
      isNull(products.yieldQuantity),
      exists(
        db
          .select({ one: sql`1` })
          .from(productIngredients)
          .where(eq(productIngredients.productId, products.id)),
      ),
    ),
  ];
  if (options.afterProductId) conditions.push(gt(products.id, options.afterProductId));
  if (options.businessId) conditions.push(eq(products.businessId, options.businessId));

  const candidates = await db
    .select({ productId: products.id, userId: businesses.ownerUserId })
    .from(products)
    .innerJoin(businesses, eq(products.businessId, businesses.id))
    .where(and(...conditions))
    .orderBy(products.id)
    .limit(batchSize);

  for (const candidate of candidates) {
    // This internal job reads the owner only from businesses.owner_user_id,
    // whose FK references profiles. It never accepts a caller-provided id;
    // see the documented backfill contract for this trusted boundary.
    const userId = candidate.userId as VerifiedUserId;
    await runVariableCostTransaction(db, async (tx) => {
      const recipe = await tx
        .select({ supplyId: productIngredients.supplyId })
        .from(productIngredients)
        .where(eq(productIngredients.productId, candidate.productId));
      await lockVariableCostSupplies(
        tx,
        userId,
        recipe.map((ingredient) => ingredient.supplyId),
      );

      const [lockedProduct] = await tx
        .select({ id: products.id })
        .from(products)
        .innerJoin(businesses, eq(products.businessId, businesses.id))
        .where(
          and(
            eq(products.id, candidate.productId),
            eq(products.variableCostStatus, "pending"),
            eq(businesses.ownerUserId, userId),
          ),
        )
        .for("update")
        .limit(1);
      if (!lockedProduct) return;

      await recalculatePersistedProductVariableCostsTx(tx, userId, candidate.productId);
    });
  }

  return {
    processed: candidates.length,
    nextAfterProductId:
      candidates.length === batchSize ? (candidates[candidates.length - 1]?.productId ?? null) : null,
  };
}
