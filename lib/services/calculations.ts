import "server-only";
import type { VerifiedUserId } from "./auth";

import { asc, eq, sql } from "drizzle-orm";

import { businesses } from "@/lib/db/business/table";
import type { Db } from "@/lib/db/client";

// Shared service helpers for the phase-2 catalog flow. The legacy wizard
// operations (active calculation pointer, create/list/resolve calculations)
// were removed with the single-product calculator flow.

// postgres-js transactions expose the same query API as the db client.
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Oldest owned business wins; created with a sensible default on first use.
// owner_user_id is intentionally not UNIQUE (a user will be able to own several
// businesses), so the check-then-insert is serialized per user with a
// transaction-scoped advisory lock: concurrent first requests (double click,
// product + period cost in parallel) would otherwise each insert a business.
export async function getOrCreateDefaultBusiness(tx: Tx, userId: VerifiedUserId) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`default-business:${userId}`}, 0))`,
  );

  const [existing] = await tx
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .orderBy(asc(businesses.createdAt), asc(businesses.id))
    .limit(1);

  if (existing) return existing;

  const [created] = await tx
    .insert(businesses)
    .values({ name: "Mi negocio", ownerUserId: userId })
    .returning();
  return created;
}
