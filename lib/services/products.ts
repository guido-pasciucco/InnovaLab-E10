import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import {
  adaptCatalogVariableCosts,
  type CatalogPresentation,
  type CatalogSupply,
} from "@/lib/calc/adaptCatalogVariableCosts";
import { calculateVariableCosts } from "@/lib/calc/calculateVariableCosts";
import { convertRecipeQuantityToMinimumUnits } from "@/lib/calc/recipeUnits";

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
import { RECIPE_UNIT_FAMILY_MESSAGE } from "@/lib/schemas/products/fields";
import type {
  ProductItem,
  ProductRecipeItem,
} from "@/lib/schemas/products/products";
import {
  getSupplyUnit,
  isRecipeUnitAllowed,
  getSupplyUnitFamily,
} from "@/lib/schemas/supplies/units";
import type { VerifiedUserId } from "@/lib/services/auth";
import { getOrCreateDefaultBusiness, type Tx } from "./calculations";
import {
  lockVariableCostSupplies,
  runVariableCostTransaction,
} from "./variable-cost-transaction";

// Product + recipe persistence for the catalog (#255). Owner scoping:
// products are reached through businesses.ownerUserId and recipe lines through
// supplies.userId. The service validates with the server gate from lib/db,
// never with the client form contract. It throws (ZodError, AppError); doors
// translate. No try/catch.

type RecipeInput = { supplyId: string; quantity: string; unit: string };

type RecipeSupply = {
  name: string;
  purchaseUnit: string;
};

type ResolvedRecipeLine = RecipeInput;

function toYieldQuantity(value: number | null): string | null {
  return value === null ? null : String(value);
}

export type ProductVariableCostsState = Pick<
  ProductItem,
  "variableCosts" | "variableCostsUnavailableCode"
>;

type PersistedVariableCosts = {
  variableCostStatus: "pending" | "ready" | "unavailable";
  variableCostUnitAmount: string | null;
  variableCostUnitNumerator: string | null;
  variableCostUnitDenominator: string | null;
  variableCostRecipeAmount: string | null;
  variableCostRecipeNumerator: string | null;
  variableCostRecipeDenominator: string | null;
  variableCostUnavailableCode: string | null;
  variableCostCalculatedAt: Date | null;
};

/** A presentation as the cost engine reads it: units plus packaging lines. */
export type PresentationForCost = {
  id: string;
  name: string;
  unitsPerPresentation: string;
  packaging: { supplyId: string; quantity: string; unit: string }[];
};

/**
 * Computes a current cost from source records without using rounded output.
 * Presentations are optional: the persisted product cost never includes them,
 * while the P12 view (#298) passes them to get each presentation's cost.
 */
export function deriveProductVariableCosts(
  product: Pick<ProductItem, "yieldQuantity" | "recipe">,
  catalog: readonly CatalogSupply[],
  presentations: readonly PresentationForCost[] = [],
): ProductVariableCostsState {
  if (product.yieldQuantity === null) {
    return { variableCosts: null, variableCostsUnavailableCode: "MISSING_YIELD" };
  }
  if (product.recipe.length === 0) {
    return { variableCosts: null, variableCostsUnavailableCode: null };
  }

  const catalogById = new Map(catalog.map((supply) => [supply.id, supply]));
  const normalizedRecipe = product.recipe.map((ingredient) => {
    const supply = catalogById.get(ingredient.supplyId);
    if (!supply) return ingredient;

    const quantity = convertRecipeQuantityToMinimumUnits(
      ingredient.quantity,
      ingredient.unit,
    );
    if (quantity === null) return null;

    // The converted quantity is in the minimum unit of the line's catalog unit.
    return { ...ingredient, quantity, unit: getSupplyUnit(ingredient.unit)!.minimumUnit };
  });

  if (normalizedRecipe.some((ingredient) => ingredient === null)) {
    return { variableCosts: null, variableCostsUnavailableCode: "UNSUPPORTED_RECIPE_UNIT" };
  }

  const recipeForCost = normalizedRecipe as ProductItem["recipe"];

  // Packaging lines are converted to the packaging's minimum unit, exactly like
  // recipe lines (2 docenas → 24 unidades).
  const presentationsForCost = presentations.map((presentation) => ({
    ...presentation,
    packaging: presentation.packaging.map((line) => {
      const supply = catalogById.get(line.supplyId);
      if (!supply) return line;

      const quantity = convertRecipeQuantityToMinimumUnits(line.quantity, line.unit);
      if (quantity === null) return null;

      return { ...line, quantity, unit: getSupplyUnit(line.unit)!.minimumUnit };
    }),
  }));

  if (
    presentationsForCost.some((presentation) =>
      presentation.packaging.some((line) => line === null),
    )
  ) {
    return { variableCosts: null, variableCostsUnavailableCode: "UNSUPPORTED_RECIPE_UNIT" };
  }

  const usedSupplyIds = new Set([
    ...product.recipe.map((ingredient) => ingredient.supplyId),
    ...presentations.flatMap((presentation) =>
      presentation.packaging.map((line) => line.supplyId),
    ),
  ]);

  const adapted = adaptCatalogVariableCosts({
    catalog: [...usedSupplyIds].flatMap((supplyId) => {
      const supply = catalogById.get(supplyId);
      return supply ? [supply] : [];
    }),
    recipe: {
      yieldQuantity: product.yieldQuantity,
      ingredients: recipeForCost.map((ingredient) => ({
        supplyId: ingredient.supplyId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      })),
    },
    presentations: presentationsForCost as CatalogPresentation[],
  });

  if (!adapted.ok) {
    return { variableCosts: null, variableCostsUnavailableCode: adapted.code };
  }

  const result = calculateVariableCosts(adapted.input);
  return result.ok
    ? { variableCosts: result, variableCostsUnavailableCode: null }
    : { variableCosts: null, variableCostsUnavailableCode: result.code };
}

function persistenceFromVariableCosts(
  state: ProductVariableCostsState,
): PersistedVariableCosts {
  if (state.variableCosts) {
    const { exact, unitCost, ingredientsCost } = state.variableCosts;
    return {
      variableCostStatus: "ready",
      variableCostUnitAmount: unitCost,
      variableCostUnitNumerator: exact.unitCost.numerator,
      variableCostUnitDenominator: exact.unitCost.denominator,
      variableCostRecipeAmount: ingredientsCost,
      variableCostRecipeNumerator: exact.ingredientsCost.numerator,
      variableCostRecipeDenominator: exact.ingredientsCost.denominator,
      variableCostUnavailableCode: null,
      variableCostCalculatedAt: new Date(),
    };
  }

  return {
    variableCostStatus:
      state.variableCostsUnavailableCode === null ? "pending" : "unavailable",
    variableCostUnitAmount: null,
    variableCostUnitNumerator: null,
    variableCostUnitDenominator: null,
    variableCostRecipeAmount: null,
    variableCostRecipeNumerator: null,
    variableCostRecipeDenominator: null,
    variableCostUnavailableCode: state.variableCostsUnavailableCode,
    variableCostCalculatedAt: new Date(),
  };
}

// numeric(14,4) always returns four decimals ("250.0000"). The recipe form
// accepts up to four and must be able to round-trip the saved value, so the API
// trims trailing zeros without changing the stored precision.
export function toFormQuantity(value: string): string {
  if (!value.includes(".")) return value;

  const trimmed = value.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed === "" ? "0" : trimmed;
}

function toProductItem(
  product: Product,
  ingredients: ProductIngredient[],
  suppliesById: Map<string, RecipeSupply>,
): ProductItem {
  return {
    id: product.id,
    name: product.name,
    monthlyCapacity: product.monthlyCapacity,
    yieldQuantity: toYieldQuantity(product.yieldQuantity),
    variableCosts: null,
    variableCostsUnavailableCode: null,
    recipe: ingredients.map((ingredient) => ({
      supplyId: ingredient.supplyId,
      supplyName: suppliesById.get(ingredient.supplyId)?.name ?? "",
      quantity: toFormQuantity(ingredient.quantity),
      unit: ingredient.unit ?? "",
    })),
  };
}

function persistedVariableCosts(product: Product): ProductVariableCostsState {
  if (
    product.variableCostStatus === "ready" &&
    product.variableCostUnitAmount !== null &&
    product.variableCostUnitNumerator !== null &&
    product.variableCostUnitDenominator !== null &&
    product.variableCostRecipeAmount !== null &&
    product.variableCostRecipeNumerator !== null &&
    product.variableCostRecipeDenominator !== null
  ) {
    const unitRatio =
      product.variableCostUnitDenominator === "1"
        ? product.variableCostUnitNumerator
        : `${product.variableCostUnitNumerator}/${product.variableCostUnitDenominator}`;

    return {
      variableCosts: {
        ok: true,
        ingredientsCost: product.variableCostRecipeAmount,
        recipeYield: toYieldQuantity(product.yieldQuantity) ?? "",
        unitCost: product.variableCostUnitAmount,
        unitCostCalculationValue: unitRatio,
        exact: {
          ingredientsCost: {
            numerator: product.variableCostRecipeNumerator,
            denominator: product.variableCostRecipeDenominator,
          },
          unitCost: {
            numerator: product.variableCostUnitNumerator,
            denominator: product.variableCostUnitDenominator,
          },
        },
        presentations: [],
      },
      variableCostsUnavailableCode: null,
    };
  }

  return {
    variableCosts: null,
    variableCostsUnavailableCode:
      product.variableCostStatus === "unavailable"
        ? (product.variableCostUnavailableCode as ProductItem["variableCostsUnavailableCode"])
        : null,
  };
}

/**
 * Stores the exact current variable-cost result in the caller's transaction.
 * It deliberately receives `tx`: create/update and their derived values either
 * commit together or roll back together; it never starts a nested transaction.
 * A future supply-update path must use this same helper after acquiring its
 * supply/product locks in the documented global order.
 */
export async function persistProductVariableCostsTx(
  tx: Tx,
  userId: VerifiedUserId,
  product: Product,
  ingredients: ProductIngredient[],
  suppliesById: Map<string, RecipeSupply>,
): Promise<ProductVariableCostsState> {
  const item = toProductItem(product, ingredients, suppliesById);
  const catalog = await tx.select().from(supplies).where(eq(supplies.userId, userId));
  const state = deriveProductVariableCosts(item, catalog);

  await tx
    .update(products)
    .set(persistenceFromVariableCosts(state))
    .where(eq(products.id, product.id));

  return state;
}

/** Recalculates one already-locked product from the persisted catalog. */
export async function recalculatePersistedProductVariableCostsTx(
  tx: Tx,
  userId: VerifiedUserId,
  productId: string,
): Promise<ProductVariableCostsState | null> {
  const [row] = await tx
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

  if (!row) return null;

  const ingredients = await tx
    .select()
    .from(productIngredients)
    .where(eq(productIngredients.productId, productId))
    .orderBy(productIngredients.createdAt, productIngredients.id);
  const catalog = await tx.select().from(supplies).where(eq(supplies.userId, userId));
  const suppliesById = new Map(
    catalog.map((supply) => [
      supply.id,
      {
        name: supply.name,
        purchaseUnit: supply.purchaseUnit,
      },
    ]),
  );

  return persistProductVariableCostsTx(tx, userId, row.product, ingredients, suppliesById);
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
    unit: ingredient.unit ?? "",
  }));
}

// Validates the recipe against the caller's catalog in one query. Foreign,
// missing and packaging ids all fail before the product is written.
async function resolveRecipeSupplies(
  userId: VerifiedUserId,
  recipe: readonly RecipeInput[],
  db: Db | Tx,
): Promise<Map<string, RecipeSupply>> {
  const ids = [...new Set(recipe.map((item) => item.supplyId))];

  const rows = await db
    .select({
      id: supplies.id,
      name: supplies.name,
      kind: supplies.kind,
      purchaseUnit: supplies.purchaseUnit,
    })
    .from(supplies)
    .where(and(eq(supplies.userId, userId), inArray(supplies.id, ids)));

  if (rows.length !== ids.length) {
    throw new AppError("SUPPLY_NOT_FOUND");
  }

  if (rows.some((row) => row.kind !== "supply")) {
    throw new AppError("SUPPLY_NOT_INGREDIENT");
  }

  return new Map(
    rows.map((row) => [
      row.id,
      {
        name: row.name,
        purchaseUnit: row.purchaseUnit,
      },
    ]),
  );
}

function invalidRecipeUnit(): never {
  throw new AppError("VALIDATION", {
    formErrors: [],
    fieldErrors: { recipe: [RECIPE_UNIT_FAMILY_MESSAGE] },
  });
}

// Keeps catalog units canonical and rejects mixing families (kg → L), units
// outside the catalog and supplies whose own unit is outside the catalog.
function resolveRecipeUnits(
  recipe: readonly RecipeInput[],
  suppliesById: Map<string, RecipeSupply>,
): ResolvedRecipeLine[] {
  return recipe.map((item) => {
    const supply = suppliesById.get(item.supplyId);

    if (!supply) {
      throw new AppError("SUPPLY_NOT_FOUND");
    }

    if (!isRecipeUnitAllowed(getSupplyUnitFamily(supply.purchaseUnit), item.unit)) {
      invalidRecipeUnit();
    }

    return { ...item, unit: getSupplyUnit(item.unit)!.value };
  });
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
      unit: ingredient.unit ?? "",
    });
    recipesByProduct.set(ingredient.productId, recipe);
  }

  return productRows.map(({ product }) => {
    const item: ProductItem = {
      id: product.id,
      name: product.name,
      monthlyCapacity: product.monthlyCapacity,
      yieldQuantity: toYieldQuantity(product.yieldQuantity),
      recipe: recipesByProduct.get(product.id) ?? [],
      variableCosts: null,
      variableCostsUnavailableCode: null,
    };
    return { ...item, ...persistedVariableCosts(product) };
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
    monthlyCapacity: row.product.monthlyCapacity,
    yieldQuantity: toYieldQuantity(row.product.yieldQuantity),
    variableCosts: null,
    variableCostsUnavailableCode: null,
    recipe: await mapRecipeRows(db, productId),
  };
  return { ...item, ...persistedVariableCosts(row.product) };
}

export async function createProductService(
  userId: VerifiedUserId,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<ProductItem> {
  const data = saveProductInputSchema.parse(input);

  return runVariableCostTransaction(db, async (tx) => {
    const lockedSupplies = await lockVariableCostSupplies(
      tx,
      userId,
      data.recipe.map((item) => item.supplyId),
    );
    if (lockedSupplies.length !== new Set(data.recipe.map((item) => item.supplyId)).size) {
      throw new AppError("SUPPLY_NOT_FOUND");
    }
    const suppliesById = await resolveRecipeSupplies(userId, data.recipe, tx);
    const recipe = resolveRecipeUnits(data.recipe, suppliesById);
    const business = await getOrCreateDefaultBusiness(tx, userId);

    const [product] = await tx
      .insert(products)
      .values({
        name: data.name,
        monthlyCapacity: data.monthlyCapacity,
        yieldQuantity: Number(data.yieldQuantity),
        businessId: business.id,
      })
      .returning();

    if (!product) {
      throw new AppError("INTERNAL", undefined, {
        cause: "createProductService: no product returned",
      });
    }

    const ingredients = await tx
      .insert(productIngredients)
      .values(
        recipe.map((item) => ({
          productId: product.id,
          supplyId: item.supplyId,
          quantity: item.quantity,
          unit: item.unit,
        })),
      )
      .returning();

    const item = toProductItem(product, ingredients, suppliesById);
    const variableCosts = await persistProductVariableCostsTx(
      tx,
      userId,
      product,
      ingredients,
      suppliesById,
    );
    return { ...item, ...variableCosts };
  });
}

export async function updateProductService(
  userId: VerifiedUserId,
  productId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<ProductItem | null> {
  const data = saveProductInputSchema.parse(input);

  return runVariableCostTransaction(db, async (tx) => {
    // Preserve the public not-found contract before inspecting recipe rows of
    // a product that might belong to another owner.
    const [preliminaryOwner] = await tx
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

    if (!preliminaryOwner) {
      return null;
    }

    const existingRecipe = await tx
      .select({ supplyId: productIngredients.supplyId })
      .from(productIngredients)
      .where(eq(productIngredients.productId, productId));
    const lockedSupplies = await lockVariableCostSupplies(tx, userId, [
      ...existingRecipe.map((item) => item.supplyId),
      ...data.recipe.map((item) => item.supplyId),
    ]);
    const expectedSupplyCount = new Set([
      ...existingRecipe.map((item) => item.supplyId),
      ...data.recipe.map((item) => item.supplyId),
    ]).size;
    if (lockedSupplies.length !== expectedSupplyCount) {
      throw new AppError("SUPPLY_NOT_FOUND");
    }
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
      .for("update")
      .limit(1);

    if (!owned) {
      return null;
    }

    const suppliesById = await resolveRecipeSupplies(userId, data.recipe, tx);
    const recipe = resolveRecipeUnits(data.recipe, suppliesById);

    const [product] = await tx
      .update(products)
      .set({
        name: data.name,
        monthlyCapacity: data.monthlyCapacity,
        yieldQuantity: Number(data.yieldQuantity),
        updatedAt: new Date(),
      })
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
        recipe.map((item) => ({
          productId: product.id,
          supplyId: item.supplyId,
          quantity: item.quantity,
          unit: item.unit,
        })),
      )
      .returning();

    const item = toProductItem(product, ingredients, suppliesById);
    const variableCosts = await persistProductVariableCostsTx(
      tx,
      userId,
      product,
      ingredients,
      suppliesById,
    );
    return { ...item, ...variableCosts };
  });
}

// Used by the supply-in-use dialog: drop one ingredient from a recipe without
// making the user rewrite the whole product. It reuses the normal update path
// so locking, unit resolution and CVU recalculation stay in one place.
/** @throws AppError PRODUCT_NOT_FOUND | PRODUCT_RECIPE_NEEDS_INGREDIENT */
export async function removeSupplyFromProductService(
  userId: VerifiedUserId,
  productId: string,
  supplyId: string,
  db: Db = getDrizzleClient(),
): Promise<ProductItem | null> {
  const product = await getProductService(userId, productId, db);
  if (!product) return null;

  const recipe = product.recipe.filter((item) => item.supplyId !== supplyId);
  if (recipe.length === product.recipe.length) return null;
  if (recipe.length === 0) throw new AppError("PRODUCT_RECIPE_NEEDS_INGREDIENT");

  // Legacy rows may still have a null yield; the documented default is 1.
  return updateProductService(
    userId,
    productId,
    {
      name: product.name,
      monthlyCapacity: product.monthlyCapacity,
      yieldQuantity: product.yieldQuantity ?? "1",
      recipe,
    },
    db,
  );
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
