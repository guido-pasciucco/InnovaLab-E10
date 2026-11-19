import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import {
  adaptCatalogVariableCosts,
  type CatalogSupply,
} from "@/lib/calc/adaptCatalogVariableCosts";
import {
  calculateVariableCosts,
} from "@/lib/calc/calculateVariableCosts";

import {
  businesses,
  productIngredients,
  products,
  type Product,
  type ProductIngredient,
} from "@/lib/db/business/table";
import { saveProductInputSchema } from "@/lib/db/business/validation";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { supplies } from "@/lib/db/supplies/table";
import { AppError } from "@/lib/errors/app-error";
import type {
  ProductItem,
  ProductRecipeItem,
} from "@/lib/schemas/products/products";
import type { VerifiedUserId } from "@/lib/services/auth";
import { getOrCreateDefaultBusiness, type Tx } from "./calculations";

// Product + recipe persistence for the catalog (#255). Owner scoping:
// products are reached through businesses.ownerUserId and recipe lines through
// supplies.userId. The service validates with the server gate from lib/db,
// never with the client form contract. It throws (ZodError, AppError); doors
// translate. No try/catch.

type RecipeInput = { supplyId: string; quantity: string };

function toYieldQuantity(value: number | null): string | null {
  return value === null ? null : String(value);
}

export type ProductVariableCostsState = Pick<
  ProductItem,
  "variableCosts" | "variableCostsUnavailableCode"
>;

/**
 * Computes the current catalog cost from persisted source values. Domain
 * failures are represented explicitly; unexpected exceptions intentionally
 * propagate to preserve database and infrastructure failure semantics.
 */
export function deriveProductVariableCosts(
  product: Pick<ProductItem, "yieldQuantity" | "recipe">,
  catalog: readonly CatalogSupply[],
): ProductVariableCostsState {
  if (product.yieldQuantity === null || product.recipe.length === 0) {
    return { variableCosts: null, variableCostsUnavailableCode: null };
  }
  const catalogById = new Map(catalog.map((supply) => [supply.id, supply]));
  const adapted = adaptCatalogVariableCosts({
    // Keep only catalog rows referenced by this product, but preserve every
    // recipe line below. A missing ingredient then becomes
    // MISSING_INGREDIENT_SUPPLY without unrelated legacy catalog rows blocking
    // an otherwise valid product.
    catalog: product.recipe.flatMap((ingredient) => {
      const supply = catalogById.get(ingredient.supplyId);
      return supply ? [supply] : [];
    }),
    recipe: {
      yieldQuantity: product.yieldQuantity,
      ingredients: product.recipe.map((ingredient) => ({
        supplyId: ingredient.supplyId,
        quantity: ingredient.quantity,
        unit: catalogById.get(ingredient.supplyId)?.minimumUnit ?? "",
      })),
    },
    presentations: [],
  });
  if (!adapted.ok) {
    return { variableCosts: null, variableCostsUnavailableCode: adapted.code };
  }
  const result = calculateVariableCosts(adapted.input);
  if (!result.ok) {
    return { variableCosts: null, variableCostsUnavailableCode: result.code };
  }
  return { variableCosts: result, variableCostsUnavailableCode: null };
}

// numeric(14,4) always returns four decimals ("250.0000"). The recipe form
// accepts up to four and must be able to round-trip the saved value, so the API
// trims trailing zeros without changing the stored precision.
function toFormQuantity(value: string): string {
  if (!value.includes(".")) return value;

  const trimmed = value.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed === "" ? "0" : trimmed;
}

function toProductItem(
  product: Product,
  ingredients: ProductIngredient[],
  supplyNames: Map<string, string>,
): ProductItem {
  return {
    id: product.id,
    name: product.name,
    yieldQuantity: toYieldQuantity(product.yieldQuantity),
    variableCosts: null,
    variableCostsUnavailableCode: null,
    recipe: ingredients.map((ingredient) => ({
      supplyId: ingredient.supplyId,
      supplyName: supplyNames.get(ingredient.supplyId) ?? "",
      quantity: toFormQuantity(ingredient.quantity),
    })),
  };
}

async function mapRecipeRows(
  db: Db | Tx,
  productId: string,
): Promise<ProductRecipeItem[]> {
  const rows = await db
    .select({
      ingredient: productIngredients,
      supplyName: supplies.name,
    })
    .from(productIngredients)
    .innerJoin(supplies, eq(productIngredients.supplyId, supplies.id))
    .where(eq(productIngredients.productId, productId))
    .orderBy(productIngredients.createdAt, productIngredients.id);

  return rows.map(({ ingredient, supplyName }) => ({
    supplyId: ingredient.supplyId,
    supplyName,
    quantity: toFormQuantity(ingredient.quantity),
  }));
}

// Validates the recipe against the caller's catalog in one query. Foreign,
// missing and packaging ids all fail before the product is written.
async function resolveRecipeSupplies(
  userId: VerifiedUserId,
  recipe: readonly RecipeInput[],
  db: Db | Tx,
): Promise<Map<string, string>> {
  const ids = [...new Set(recipe.map((item) => item.supplyId))];

  const rows = await db
    .select({ id: supplies.id, name: supplies.name, kind: supplies.kind })
    .from(supplies)
    .where(and(eq(supplies.userId, userId), inArray(supplies.id, ids)));

  if (rows.length !== ids.length) {
    throw new AppError("SUPPLY_NOT_FOUND");
  }

  if (rows.some((row) => row.kind !== "supply")) {
    throw new AppError("SUPPLY_NOT_INGREDIENT");
  }

  return new Map(rows.map((row) => [row.id, row.name]));
}

export async function listProductsService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<ProductItem[]> {
  const productRows = await db
    .select({ product: products })
    .from(products)
    .innerJoin(businesses, eq(products.businessId, businesses.id))
    .where(and(eq(businesses.ownerUserId, userId), eq(products.isActive, true)))
    .orderBy(products.createdAt, products.id);

  if (productRows.length === 0) {
    return [];
  }

  const productIds = productRows.map(({ product }) => product.id);
  const catalog = await db.select().from(supplies).where(eq(supplies.userId, userId));
  const ingredientRows = await db
    .select({
      ingredient: productIngredients,
      supplyName: supplies.name,
    })
    .from(productIngredients)
    .innerJoin(supplies, eq(productIngredients.supplyId, supplies.id))
    .where(inArray(productIngredients.productId, productIds))
    .orderBy(productIngredients.createdAt, productIngredients.id);

  const recipesByProduct = new Map<string, ProductRecipeItem[]>();

  for (const { ingredient, supplyName } of ingredientRows) {
    const recipe = recipesByProduct.get(ingredient.productId) ?? [];
    recipe.push({
      supplyId: ingredient.supplyId,
      supplyName,
      quantity: toFormQuantity(ingredient.quantity),
    });
    recipesByProduct.set(ingredient.productId, recipe);
  }

  return productRows.map(({ product }) => {
    const item: ProductItem = {
    id: product.id,
    name: product.name,
    yieldQuantity: toYieldQuantity(product.yieldQuantity),
    recipe: recipesByProduct.get(product.id) ?? [],
    variableCosts: null,
    variableCostsUnavailableCode: null,
    };
    return { ...item, ...deriveProductVariableCosts(item, catalog) };
  });
}

export async function getProductService(
  userId: VerifiedUserId,
  productId: string,
  db: Db = getDrizzleClient(),
): Promise<ProductItem | null> {
  const [row] = await db
    .select({ product: products })
    .from(products)
    .innerJoin(businesses, eq(products.businessId, businesses.id))
    .where(
      and(
        eq(products.id, productId),
        eq(businesses.ownerUserId, userId),
        eq(products.isActive, true),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const item: ProductItem = {
    id: row.product.id,
    name: row.product.name,
    yieldQuantity: toYieldQuantity(row.product.yieldQuantity),
    variableCosts: null,
    variableCostsUnavailableCode: null,
    recipe: await mapRecipeRows(db, productId),
  };
  const catalog = await db.select().from(supplies).where(eq(supplies.userId, userId));
  return { ...item, ...deriveProductVariableCosts(item, catalog) };
}

export async function createProductService(
  userId: VerifiedUserId,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<ProductItem> {
  const data = saveProductInputSchema.parse(input);

  return db.transaction(async (tx) => {
    const supplyNames = await resolveRecipeSupplies(userId, data.recipe, tx);
    const business = await getOrCreateDefaultBusiness(tx, userId);

    const [product] = await tx
      .insert(products)
      .values({ name: data.name, yieldQuantity: Number(data.yieldQuantity), businessId: business.id })
      .returning();

    if (!product) {
      throw new AppError("INTERNAL", undefined, {
        cause: "createProductService: no product returned",
      });
    }

    const ingredients = await tx
      .insert(productIngredients)
      .values(
        data.recipe.map((item) => ({
          productId: product.id,
          supplyId: item.supplyId,
          quantity: item.quantity,
        })),
      )
      .returning();

    const item = toProductItem(product, ingredients, supplyNames);
    const catalog = await tx.select().from(supplies).where(eq(supplies.userId, userId));
    return { ...item, ...deriveProductVariableCosts(item, catalog) };
  });
}

export async function updateProductService(
  userId: VerifiedUserId,
  productId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<ProductItem | null> {
  const data = saveProductInputSchema.parse(input);

  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: products.id })
      .from(products)
      .innerJoin(businesses, eq(products.businessId, businesses.id))
      .where(
        and(
          eq(products.id, productId),
          eq(businesses.ownerUserId, userId),
          eq(products.isActive, true),
        ),
      )
      .limit(1);

    if (!owned) {
      return null;
    }

    const supplyNames = await resolveRecipeSupplies(userId, data.recipe, tx);

    const [product] = await tx
      .update(products)
      .set({ name: data.name, yieldQuantity: Number(data.yieldQuantity), updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning();

    if (!product) {
      throw new AppError("INTERNAL", undefined, {
        cause: "updateProductService: no product returned",
      });
    }

    await tx
      .delete(productIngredients)
      .where(eq(productIngredients.productId, productId));

    const ingredients = await tx
      .insert(productIngredients)
      .values(
        data.recipe.map((item) => ({
          productId: product.id,
          supplyId: item.supplyId,
          quantity: item.quantity,
        })),
      )
      .returning();

    const item = toProductItem(product, ingredients, supplyNames);
    const catalog = await tx.select().from(supplies).where(eq(supplies.userId, userId));
    return { ...item, ...deriveProductVariableCosts(item, catalog) };
  });
}

// Soft delete: the product disappears from the catalog but keeps its recipe
// and its calculations. The exact behavior once DATA confirms it is still open
// (#255); this is the recommended baseline.
export async function deleteProductService(
  userId: VerifiedUserId,
  productId: string,
  db: Db = getDrizzleClient(),
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: products.id })
      .from(products)
      .innerJoin(businesses, eq(products.businessId, businesses.id))
      .where(
        and(
          eq(products.id, productId),
          eq(businesses.ownerUserId, userId),
          eq(products.isActive, true),
        ),
      )
      .limit(1);

    if (!owned) {
      return false;
    }

    await tx
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, productId));

    return true;
  });
}
