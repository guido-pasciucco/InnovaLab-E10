import "server-only";

import { and, eq } from "drizzle-orm";

import { businesses } from "@/lib/db/business/table";
import { supplies } from "@/lib/db/supplies/table";
import {
  createSupplyInputSchema,
  type SupplyRow,
  updateSupplyInputSchema,
} from "@/lib/db/supplies/validation";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";
import type { VerifiedUserId } from "@/lib/services/auth";

// Supply catalog persistence (ADR 0005: the catalog lives server-side only).
// Input is validated with the server gate from lib/db, never with the client
// form contract. Owner scoping: every query and write filters by the caller's
// userId (VerifiedUserId, ADR 03). The service throws (ZodError, AppError);
// doors translate. No try/catch.

export async function listSuppliesService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<SupplyRow[]> {
  const rows = await db
    .select()
    .from(supplies)
    .where(eq(supplies.userId, userId))
    .orderBy(supplies.createdAt, supplies.id);
  return rows;
}

export async function createSupplyService(
  userId: VerifiedUserId,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<SupplyRow> {
  const supply = createSupplyInputSchema.parse(input);

  const [row] = await db
    .insert(supplies)
    .values({
      userId,
      name: supply.name,
      purchasePrice: supply.purchasePrice,
    })
    .returning();

  if (!row) {
    throw new AppError("INTERNAL", { cause: "createSupplyService: no row returned" });
  }

  return row;
}

export async function updateSupplyService(
  userId: VerifiedUserId,
  supplyId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<SupplyRow | null> {
  const supply = updateSupplyInputSchema.parse(input);

  const [row] = await db
    .update(supplies)
    .set({
      name: supply.name,
      purchasePrice: supply.purchasePrice,
      updatedAt: new Date(),
    })
    .where(and(eq(supplies.id, supplyId), eq(supplies.userId, userId)))
    .returning();

  return row ?? null;
}

export async function deleteSupplyService(
  userId: VerifiedUserId,
  supplyId: string,
  db: Db = getDrizzleClient(),
): Promise<boolean> {
  const [row] = await db
    .delete(supplies)
    .where(and(eq(supplies.id, supplyId), eq(supplies.userId, userId)))
    .returning({ id: supplies.id });

  return row !== undefined;
}

export async function getUserDefaultBusiness(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<{ id: string; name: string } | null> {
  const [row] = await db
    .select({ id: businesses.id, name: businesses.name })
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);

  return row ?? null;
}
