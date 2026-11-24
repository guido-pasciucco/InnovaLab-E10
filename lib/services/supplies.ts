import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import {
  businesses,
  presentationPackaging,
  presentations,
  productIngredients,
  products,
} from "@/lib/db/business/table";
import { supplies } from "@/lib/db/supplies/table";
import type { SupplyUsage } from "@/lib/schemas/supplies/supply-usage";
import {
  createSupplyInputSchema,
  type SupplyRow,
  updateSupplyInputSchema,
} from "@/lib/db/supplies/validation";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";
import { getSupplyUnit, getSupplyUnitFamily } from "@/lib/schemas/supplies/units";
import type { VerifiedUserId } from "@/lib/services/auth";
import { isSupplyUsedByPresentation } from "./presentations";
import { recalculatePersistedProductVariableCostsTx } from "./products";
import {
  lockVariableCostSupplies,
  runVariableCostTransaction,
} from "./variable-cost-transaction";

// Supply catalog persistence (ADR 0005: the catalog lives server-side only).
// Input is validated with the server gate from lib/db, never with the client
// form contract. Owner scoping: every query and write filters by the caller's
// userId (VerifiedUserId, ADR 03). The service throws (ZodError, AppError);
// doors translate. No try/catch.

// The gate already rejected units outside the catalog; this stores the
// canonical spelling ("kilo" → "kg").
function canonicalPurchaseUnit(purchaseUnit: string): string {
  return getSupplyUnit(purchaseUnit)?.value ?? purchaseUnit;
}

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
      kind: supply.kind,
      name: supply.name,
      purchasePrice: supply.purchasePrice,
      purchaseQuantity: supply.purchaseQuantity,
      purchaseUnit: canonicalPurchaseUnit(supply.purchaseUnit),
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

  return runVariableCostTransaction(db, async (tx) => {
    // Do not reveal recipe usage for a foreign or absent supply.
    const [preliminaryOwner] = await tx
      .select({ id: supplies.id })
      .from(supplies)
      .where(and(eq(supplies.id, supplyId), eq(supplies.userId, userId)))
      .limit(1);
    if (!preliminaryOwner) return null;

    // Read the affected graph before locking it. Serializable isolation makes
    // a concurrent recipe rewrite retry; the stable supply/product lock order
    // prevents a stale catalog snapshot from committing.
    const affectedRows = await tx
      .select({ productId: products.id })
      .from(productIngredients)
      .innerJoin(products, eq(productIngredients.productId, products.id))
      .innerJoin(businesses, eq(products.businessId, businesses.id))
      .where(
        and(
          eq(productIngredients.supplyId, supplyId),
          eq(products.isActive, true),
          eq(businesses.ownerUserId, userId),
        ),
      );
    const affectedProductIds = [...new Set(affectedRows.map((row) => row.productId))].sort();
    const relatedIngredients =
      affectedProductIds.length === 0
        ? []
        : await tx
            .select({ supplyId: productIngredients.supplyId })
            .from(productIngredients)
            .where(inArray(productIngredients.productId, affectedProductIds));

    const lockedSupplies = await lockVariableCostSupplies(tx, userId, [
      supplyId,
      ...relatedIngredients.map((ingredient) => ingredient.supplyId),
    ]);
    if (!lockedSupplies.some((locked) => locked.id === supplyId)) return null;

    const [existing] = await tx
      .select()
      .from(supplies)
      .where(and(eq(supplies.id, supplyId), eq(supplies.userId, userId)))
      .limit(1);
    if (!existing) return null;

    // Another family (kg → L) would invalidate saved recipe and packaging
    // quantities; another unit of the same family (kg → g) would not.
    const changesRecipeMeaning =
      supply.kind !== existing.kind ||
      getSupplyUnitFamily(supply.purchaseUnit) !== getSupplyUnitFamily(existing.purchaseUnit);
    if (changesRecipeMeaning) {
      const [used] = await tx
        .select({ id: productIngredients.id })
        .from(productIngredients)
        .where(eq(productIngredients.supplyId, supplyId))
        .limit(1);
      if (used || (await isSupplyUsedByPresentation(tx, supplyId))) {
        throw new AppError("SUPPLY_IN_USE");
      }
    }

    if (affectedProductIds.length > 0) {
      await tx
        .select({ id: products.id })
        .from(products)
        .where(inArray(products.id, affectedProductIds))
        .orderBy(products.id)
        .for("update");
    }

    const [row] = await tx
      .update(supplies)
      .set({
        kind: supply.kind,
        name: supply.name,
        purchasePrice: supply.purchasePrice,
        purchaseQuantity: supply.purchaseQuantity,
        purchaseUnit: canonicalPurchaseUnit(supply.purchaseUnit),
        updatedAt: new Date(),
      })
      .where(and(eq(supplies.id, supplyId), eq(supplies.userId, userId)))
      .returning();

    if (!row) return null;

    for (const productId of affectedProductIds) {
      await recalculatePersistedProductVariableCostsTx(tx, userId, productId);
    }

    return row;
  });
}

// Products and presentations that still need the supply, so the catalog can
// say exactly what breaks. Owner-scoped: a foreign product never shows up here.
async function getSupplyUsages(
  userId: VerifiedUserId,
  supplyId: string,
  db: Db,
): Promise<SupplyUsage[]> {
  const recipeRows = await db
    .select({
      productId: products.id,
      productName: products.name,
      isActive: products.isActive,
    })
    .from(productIngredients)
    .innerJoin(products, eq(productIngredients.productId, products.id))
    .innerJoin(businesses, eq(products.businessId, businesses.id))
    .where(
      and(
        eq(productIngredients.supplyId, supplyId),
        eq(businesses.ownerUserId, userId),
      ),
    )
    .orderBy(products.name, products.id);

  const productIds = [...new Set(recipeRows.map((row) => row.productId))];
  const ingredientRows =
    productIds.length === 0
      ? []
      : await db
          .select({ productId: productIngredients.productId })
          .from(productIngredients)
          .where(inArray(productIngredients.productId, productIds));
  const ingredientCounts = new Map<string, number>();
  for (const row of ingredientRows) {
    ingredientCounts.set(row.productId, (ingredientCounts.get(row.productId) ?? 0) + 1);
  }

  const presentationRows = await db
    .select({
      productId: products.id,
      productName: products.name,
      presentationId: presentations.id,
      presentationName: presentations.name,
      isActive: products.isActive,
    })
    .from(presentationPackaging)
    .innerJoin(presentations, eq(presentationPackaging.presentationId, presentations.id))
    .innerJoin(products, eq(presentations.productId, products.id))
    .innerJoin(businesses, eq(products.businessId, businesses.id))
    .where(
      and(eq(presentationPackaging.supplyId, supplyId), eq(businesses.ownerUserId, userId)),
    )
    .orderBy(products.name, presentations.name);

  return [
    ...recipeRows.map((row) => ({
      kind: "recipe" as const,
      productId: row.productId,
      productName: row.productName,
      ingredientCount: ingredientCounts.get(row.productId) ?? 1,
      isActive: row.isActive,
    })),
    ...presentationRows.map((row) => ({
      kind: "presentation" as const,
      productId: row.productId,
      productName: row.productName,
      presentationId: row.presentationId,
      presentationName: row.presentationName,
      isActive: row.isActive,
    })),
  ];
}

/** @throws AppError SUPPLY_IN_USE with the usage list in `details`. */
export async function deleteSupplyService(
  userId: VerifiedUserId,
  supplyId: string,
  db: Db = getDrizzleClient(),
): Promise<boolean> {
  // Check ownership before looking at recipes: otherwise the difference
  // between SUPPLY_IN_USE and false would reveal whether another user's supply
  // is used in a recipe.
  const [existing] = await db
    .select({ id: supplies.id })
    .from(supplies)
    .where(and(eq(supplies.id, supplyId), eq(supplies.userId, userId)))
    .limit(1);

  if (!existing) {
    return false;
  }

  // A recipe or a presentation owns the quantity, not the supply: deleting it
  // would leave them pointing at nothing. SUPPLY_IN_USE carries the exact list
  // so the door can explain the impact; the deferrable FKs are the last line of
  // defense.
  const usages = await getSupplyUsages(userId, supplyId, db);
  if (usages.length > 0) {
    throw new AppError("SUPPLY_IN_USE", { usages });
  }

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
