import "server-only";
import type { VerifiedUserId } from "./auth";

import { eq } from "drizzle-orm";

import { businesses } from "@/lib/db/business/table";
import type { Db } from "@/lib/db/client";

// Shared service helpers for the phase-2 catalog flow. The legacy wizard
// operations (active calculation pointer, create/list/resolve calculations)
// were removed with the single-product calculator flow.

// postgres-js transactions expose the same query API as the db client.
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// First owned business wins; created with a sensible default on first use.
export async function getOrCreateDefaultBusiness(tx: Tx, userId: VerifiedUserId) {
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
