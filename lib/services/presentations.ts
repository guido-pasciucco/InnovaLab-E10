import "server-only";

import { and, eq, inArray, ne } from "drizzle-orm";

import {
  businesses,
  presentationPackaging,
  presentations,
  products,
  type Presentation,
} from "@/lib/db/business/table";
import { savePresentationInputSchema } from "@/lib/db/business/validation";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { supplies } from "@/lib/db/supplies/table";
import { AppError } from "@/lib/errors/app-error";
import {
  PACKAGING_UNIT_FAMILY_MESSAGE,
  PRESENTATION_NAME_TAKEN_MESSAGE,
} from "@/lib/schemas/products/fields";
import type {
  PresentationItem,
  PresentationPackagingItem,
  ProductPresentationsView,
} from "@/lib/schemas/presentations/presentations";
import {
  getSupplyUnit,
  isRecipeUnitAllowed,
  getSupplyUnitFamily,
} from "@/lib/schemas/supplies/units";
import type { VerifiedUserId } from "@/lib/services/auth";
import type { Tx } from "./calculations";
import { deriveProductVariableCosts, getProductService, toFormQuantity } from "./products";
import {
  lockVariableCostSupplies,
  runVariableCostTransaction,
} from "./variable-cost-transaction";

// Commercial presentations of a product (P12, #298). Owner scoping: a
// presentation is reached through products → businesses.ownerUserId, and its
// packaging lines through supplies.userId. Costs are never persisted here: the
// view computes them on read from the current catalog, so a packaging price
// change is reflected without a recalculation step. The service validates with
// the server gate from lib/db and throws (ZodError, AppError); doors translate.

type PackagingInput = { supplyId: string; quantity: string; unit: string };

// Ids arrive from the URL or the client: a malformed one answers like a missing
// row instead of reaching Postgres as an invalid uuid.
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_SHAPE.test(value);
}

const ownedProduct = (userId: VerifiedUserId, productId: string) =>
  and(
    eq(products.id, productId),
    eq(businesses.ownerUserId, userId),
    eq(products.isActive, true),
  );

async function findOwnedProductId(
  db: Db | Tx,
  userId: VerifiedUserId,
  productId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .innerJoin(businesses, eq(products.businessId, businesses.id))
    .where(ownedProduct(userId, productId))
    .limit(1);

  return row?.id ?? null;
}

async function findOwnedPresentation(
  db: Db | Tx,
  userId: VerifiedUserId,
  presentationId: string,
): Promise<Presentation | null> {
  const [row] = await db
    .select({ presentation: presentations })
    .from(presentations)
    .innerJoin(products, eq(presentations.productId, products.id))
    .innerJoin(businesses, eq(products.businessId, businesses.id))
    .where(
      and(
        eq(presentations.id, presentationId),
        eq(businesses.ownerUserId, userId),
        eq(products.isActive, true),
      ),
    )
    .limit(1);

  return row?.presentation ?? null;
}

// Validates packaging lines against the caller's catalog after locking those
// rows, so a concurrent kind/unit change of the same packaging cannot pass.
async function resolvePackaging(
  tx: Tx,
  userId: VerifiedUserId,
  packaging: readonly PackagingInput[],
): Promise<PackagingInput[]> {
  if (packaging.length === 0) return [];

  const ids = packaging.map((line) => line.supplyId);
  const rows = await lockVariableCostSupplies(tx, userId, ids);

  if (rows.length !== new Set(ids).size) {
    throw new AppError("SUPPLY_NOT_FOUND");
  }
  if (rows.some((row) => row.kind !== "packaging")) {
    throw new AppError("SUPPLY_NOT_PACKAGING");
  }

  const byId = new Map(rows.map((row) => [row.id, row]));

  return packaging.map((line) => {
    const supply = byId.get(line.supplyId)!;
    const unit = getSupplyUnit(line.unit);

    if (!unit || !isRecipeUnitAllowed(getSupplyUnitFamily(supply.purchaseUnit), line.unit)) {
      throw new AppError("VALIDATION", {
        formErrors: [],
        fieldErrors: { packaging: [PACKAGING_UNIT_FAMILY_MESSAGE] },
      });
    }

    return { ...line, unit: unit.value };
  });
}

async function assertNameAvailable(
  tx: Tx,
  productId: string,
  name: string,
  exceptId?: string,
): Promise<void> {
  const [taken] = await tx
    .select({ id: presentations.id })
    .from(presentations)
    .where(
      and(
        eq(presentations.productId, productId),
        eq(presentations.name, name),
        exceptId ? ne(presentations.id, exceptId) : undefined,
      ),
    )
    .limit(1);

  if (taken) {
    throw new AppError("VALIDATION", {
      formErrors: [],
      fieldErrors: { name: [PRESENTATION_NAME_TAKEN_MESSAGE] },
    });
  }
}

async function readPresentations(
  db: Db | Tx,
  presentationRows: readonly Presentation[],
): Promise<PresentationItem[]> {
  if (presentationRows.length === 0) return [];

  const lines = await db
    .select({ line: presentationPackaging, supplyName: supplies.name })
    .from(presentationPackaging)
    .innerJoin(supplies, eq(presentationPackaging.supplyId, supplies.id))
    .where(
      inArray(
        presentationPackaging.presentationId,
        presentationRows.map((row) => row.id),
      ),
    )
    // Lines of one save share createdAt; the name keeps their order stable.
    .orderBy(presentationPackaging.createdAt, supplies.name, presentationPackaging.id);

  const linesByPresentation = new Map<string, PresentationPackagingItem[]>();
  for (const { line, supplyName } of lines) {
    const list = linesByPresentation.get(line.presentationId) ?? [];
    list.push({
      supplyId: line.supplyId,
      supplyName,
      quantity: toFormQuantity(line.quantity),
      unit: line.unit,
    });
    linesByPresentation.set(line.presentationId, list);
  }

  return presentationRows.map((row) => ({
    id: row.id,
    name: row.name,
    unitsPerPresentation: toFormQuantity(row.unitsPerPresentation),
    packaging: linesByPresentation.get(row.id) ?? [],
  }));
}

async function writePresentation(
  tx: Tx,
  userId: VerifiedUserId,
  productId: string,
  input: unknown,
  existingId?: string,
): Promise<PresentationItem> {
  const data = savePresentationInputSchema.parse(input);
  const packaging = await resolvePackaging(tx, userId, data.packaging);
  await assertNameAvailable(tx, productId, data.name, existingId);

  const values = {
    name: data.name,
    unitsPerPresentation: String(data.unitsPerPresentation),
  };

  const [row] = existingId
    ? await tx
        .update(presentations)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(presentations.id, existingId))
        .returning()
    : await tx
        .insert(presentations)
        .values({ ...values, productId })
        .returning();

  if (!row) {
    throw new AppError("INTERNAL", undefined, {
      cause: "writePresentation: no presentation returned",
    });
  }

  if (existingId) {
    await tx
      .delete(presentationPackaging)
      .where(eq(presentationPackaging.presentationId, existingId));
  }
  if (packaging.length > 0) {
    await tx.insert(presentationPackaging).values(
      packaging.map((line) => ({
        presentationId: row.id,
        supplyId: line.supplyId,
        quantity: line.quantity,
        unit: line.unit,
      })),
    );
  }

  const [item] = await readPresentations(tx, [row]);
  return item!;
}

export async function getProductPresentationsService(
  userId: VerifiedUserId,
  productId: string,
  db: Db = getDrizzleClient(),
): Promise<ProductPresentationsView | null> {
  if (!isUuid(productId)) return null;

  const product = await getProductService(userId, productId, db);
  if (!product) return null;

  const presentationRows = await db
    .select()
    .from(presentations)
    .where(eq(presentations.productId, productId))
    .orderBy(presentations.createdAt, presentations.id);
  const items = await readPresentations(db, presentationRows);
  const catalog = await db.select().from(supplies).where(eq(supplies.userId, userId));

  const usedPackagingIds = new Set(
    items.flatMap((item) => item.packaging.map((line) => line.supplyId)),
  );
  const packagingWithoutPrice = catalog
    .filter((supply) => usedPackagingIds.has(supply.id) && Number(supply.purchasePrice) === 0)
    .map((supply) => supply.id);

  return {
    product: { ...product, ...deriveProductVariableCosts(product, catalog, items) },
    presentations: items,
    packagingWithoutPrice,
  };
}

export async function createPresentationService(
  userId: VerifiedUserId,
  productId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<PresentationItem | null> {
  if (!isUuid(productId)) return null;

  return runVariableCostTransaction(db, async (tx) => {
    const owned = await findOwnedProductId(tx, userId, productId);
    if (!owned) return null;

    return writePresentation(tx, userId, owned, input);
  });
}

export async function updatePresentationService(
  userId: VerifiedUserId,
  presentationId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<PresentationItem | null> {
  if (!isUuid(presentationId)) return null;

  return runVariableCostTransaction(db, async (tx) => {
    const existing = await findOwnedPresentation(tx, userId, presentationId);
    if (!existing) return null;

    return writePresentation(tx, userId, existing.productId, input, existing.id);
  });
}

export async function deletePresentationService(
  userId: VerifiedUserId,
  presentationId: string,
  db: Db = getDrizzleClient(),
): Promise<boolean> {
  if (!isUuid(presentationId)) return false;

  return db.transaction(async (tx) => {
    const existing = await findOwnedPresentation(tx, userId, presentationId);
    if (!existing) return false;

    // presentation_packaging rows cascade with the presentation.
    await tx.delete(presentations).where(eq(presentations.id, existing.id));
    return true;
  });
}

/** Presentation names per active product of the owner, for the products list. */
export async function listPresentationNamesByProductService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<Record<string, string[]>> {
  const rows = await db
    .select({ productId: presentations.productId, name: presentations.name })
    .from(presentations)
    .innerJoin(products, eq(presentations.productId, products.id))
    .innerJoin(businesses, eq(products.businessId, businesses.id))
    .where(and(eq(businesses.ownerUserId, userId), eq(products.isActive, true)))
    .orderBy(presentations.createdAt, presentations.id);

  const names: Record<string, string[]> = {};
  for (const row of rows) {
    (names[row.productId] ??= []).push(row.name);
  }
  return names;
}

/** True when a presentation of any product uses the supply as packaging. */
export async function isSupplyUsedByPresentation(
  db: Db | Tx,
  supplyId: string,
): Promise<boolean> {
  const [used] = await db
    .select({ id: presentationPackaging.id })
    .from(presentationPackaging)
    .where(eq(presentationPackaging.supplyId, supplyId))
    .limit(1);
  return used !== undefined;
}
