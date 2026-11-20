import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { supplies } from "@/lib/db/supplies/table";
import type { Db } from "@/lib/db/client";
import type { VerifiedUserId } from "@/lib/services/auth";
import type { Tx } from "./calculations";

const MAX_SERIALIZATION_RETRIES = 5;

function isRetryableTransactionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  // Direct code check
  const code = (error as { code?: unknown }).code;
  if (code === "40001" || code === "40P01") return true;

  // Check nested cause (Drizzle wraps PostgresError)
  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === "object" && cause !== null) {
    const causeCode = (cause as { code?: unknown }).code;
    if (causeCode === "40001" || causeCode === "40P01") return true;
  }

  return false;
}

/**
 * Runs a write that also changes a persisted current CVU. PostgreSQL retries
 * serialization failures and deadlocks only; validation, ownership and engine
 * failures retain their original semantics.
 */
export async function runVariableCostTransaction<T>(
  db: Db,
  operation: (tx: Tx) => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_SERIALIZATION_RETRIES; attempt += 1) {
    try {
      return await db.transaction(operation, {
        isolationLevel: "serializable",
        accessMode: "read write",
      });
    } catch (error) {
      if (!isRetryableTransactionError(error) || attempt === MAX_SERIALIZATION_RETRIES - 1) {
        throw error;
      }
      lastError = error;
      // Small delay to reduce contention on retry
      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }

  throw lastError;
}

/**
 * All current-cost writers acquire supply rows in the same UUID order before
 * locking products. FOR UPDATE is intentionally stronger than a read lock:
 * a price update and a recipe edit cannot pass each other with different
 * catalog snapshots.
 */
export async function lockVariableCostSupplies(
  tx: Tx,
  userId: VerifiedUserId,
  supplyIds: readonly string[],
) {
  const ids = [...new Set(supplyIds)].sort();
  if (ids.length === 0) return [];

  return tx
    .select()
    .from(supplies)
    .where(and(eq(supplies.userId, userId), inArray(supplies.id, ids)))
    .orderBy(supplies.id)
    .for("update");
}
