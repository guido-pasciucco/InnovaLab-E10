import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod/v4";

import { eq } from "drizzle-orm";
import {
  businesses,
  presentationPackaging,
  presentations,
  productIngredients,
  products,
} from "@/lib/db/business/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { supplies } from "@/lib/db/supplies/table";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { backfillProductVariableCosts } from "./product-variable-cost-backfill";
import {
  createProductService,
  deleteProductService,
  getProductService,
  listProductsService,
  updateProductService,
} from "./products";
import { createPresentationService } from "./presentations";
import { createSupplyService, deleteSupplyService } from "./supplies";

// Integration tests against the local Supabase stack (.env.test URLs are
// local-only; loadTestEnv throws otherwise). One db client per file, closed in
// afterAll; users are removed after each test, cascading their business,
// products, recipe lines and supplies.

type SupplyInput = {
  kind: "supply" | "packaging";
  name: string;
  purchasePrice: string;
  purchaseQuantity: string;
  purchaseUnit: string;
};

const validSupply: SupplyInput = {
  kind: "supply",
  name: "Harina 000",
  purchasePrice: "18750.00",
  purchaseQuantity: "25",
  purchaseUnit: "kg",
};

const MISSING_ID = "00000000-0000-0000-0000-000000000000";

let db: Db;
const users: CreatedUser[] = [];

beforeAll(() => {
  process.env.DATABASE_URL = loadTestEnv().DATABASE_URL;
  globalThis.__drizzleClient = undefined;
  db = getDrizzleClient();
});

afterAll(async () => {
  try {
    if (db) await db.$client.end();
  } finally {
    globalThis.__drizzleClient = undefined;
  }
});

afterEach(async () => {
  const results = await Promise.allSettled(users.map((user) => deleteUser(user.id)));
  users.length = 0;
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((f) => f.reason),
      `cleanup failed for ${failures.length} user(s)`,
    );
  }
});

async function makeUser(): Promise<CreatedUser> {
  const user = await createUser();
  users.push(user);
  return user;
}

async function makeSupply(
  userId: CreatedUser["id"],
  overrides: Partial<typeof validSupply> = {},
) {
  return createSupplyService(userId, { ...validSupply, ...overrides }, db);
}

async function makeProduct(
  userId: CreatedUser["id"],
  supplyId: string,
  unit = "g",
  quantity = "250",
  monthlyCapacity: string | number | null = null,
) {
  return createProductService(
    userId,
    {
      name: "Pan flauta",
      monthlyCapacity,
      yieldQuantity: "12",
      recipe: [{ supplyId, quantity, unit }],
    },
    db,
  );
}

async function persistedVariableCosts(productId: string) {
  const [row] = await db
    .select({
      status: products.variableCostStatus,
      unitAmount: products.variableCostUnitAmount,
      unitNumerator: products.variableCostUnitNumerator,
      unitDenominator: products.variableCostUnitDenominator,
      recipeAmount: products.variableCostRecipeAmount,
      recipeNumerator: products.variableCostRecipeNumerator,
      recipeDenominator: products.variableCostRecipeDenominator,
      unavailableCode: products.variableCostUnavailableCode,
      calculatedAt: products.variableCostCalculatedAt,
    })
    .from(products)
    .where(eq(products.id, productId));

  if (!row) throw new Error("persisted product not found");
  return row;
}

async function businessIdFor(userId: CreatedUser["id"]): Promise<string> {
  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);
  if (!business) throw new Error("test business was not created");
  return business.id;
}

describe("products service", () => {
  it("lists empty when the user has no products", async () => {
    const user = await makeUser();

    await expect(listProductsService(user.id, db)).resolves.toEqual([]);
  });

  it("creates a product with its recipe and returns the selected supply", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);

    const product = await createProductService(
      user.id,
      {
        name: "Pan flauta",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    expect(product.name).toBe("Pan flauta");
    expect(product.monthlyCapacity).toBeNull();
    expect(product.recipe).toEqual([
      {
        supplyId: supply.id,
        supplyName: supply.name,
        quantity: "250",
        unit: "g",
      },
    ]);
  });

  it("creates a product with its monthly capacity", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);

    const product = await makeProduct(user.id, supply.id, "g", "250", "120");

    expect(product.monthlyCapacity).toBe(120);
    const rows = await listProductsService(user.id, db);
    expect(rows[0]?.monthlyCapacity).toBe(120);
  });

  it("stores a zero monthly capacity as zero", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);

    const product = await makeProduct(user.id, supply.id, "g", "250", "0");

    expect(product.monthlyCapacity).toBe(0);
  });

  it("stores an empty monthly capacity as null", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);

    const product = await makeProduct(user.id, supply.id, "g", "250", "");

    expect(product.monthlyCapacity).toBeNull();
  });

  it("rejects a negative monthly capacity before writing the product", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);

    await expect(
      makeProduct(user.id, supply.id, "g", "250", "-5"),
    ).rejects.toBeInstanceOf(ZodError);

    await expect(listProductsService(user.id, db)).resolves.toHaveLength(0);
  });

  it("persists rounded and exact current costs without using the rounded CVU as input", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id, {
      purchasePrice: "1.00",
      purchaseQuantity: "1",
      purchaseUnit: "unidad",
    });

    const product = await createProductService(
      user.id,
      {
        name: "Producto periódico",
        yieldQuantity: "3",
        recipe: [{ supplyId: supply.id, quantity: "1", unit: "unidad" }],
      },
      db,
    );

    expect(product.variableCosts?.unitCost).toBe("0.33");
    await expect(persistedVariableCosts(product.id)).resolves.toMatchObject({
      status: "ready",
      unitAmount: "0.33",
      unitNumerator: "1",
      unitDenominator: "3",
      recipeAmount: "1.00",
      recipeNumerator: "1",
      recipeDenominator: "1",
      unavailableCode: null,
      calculatedAt: expect.any(Date),
    });
  });

  it("keeps zero as a ready current cost instead of an unavailable cost", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id, {
      purchasePrice: "0.00",
      purchaseQuantity: "1",
      purchaseUnit: "unidad",
    });
    const product = await makeProduct(user.id, supply.id, "unidad", "1");

    await expect(persistedVariableCosts(product.id)).resolves.toMatchObject({
      status: "ready",
      unitAmount: "0.00",
      unitNumerator: "0",
      unitDenominator: "1",
      unavailableCode: null,
    });
  });

  it("updates the persisted exact CVU when the recipe yield changes", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id, {
      purchasePrice: "1.00",
      purchaseQuantity: "1",
      purchaseUnit: "unidad",
    });
    const product = await makeProduct(user.id, supply.id, "unidad", "1");

    await updateProductService(
      user.id,
      product.id,
      {
        name: product.name,
        yieldQuantity: "3",
        recipe: [{ supplyId: supply.id, quantity: "1", unit: "unidad" }],
      },
      db,
    );

    await expect(persistedVariableCosts(product.id)).resolves.toMatchObject({
      status: "ready",
      unitAmount: "0.33",
      unitNumerator: "1",
      unitDenominator: "3",
    });
  });

  it("keeps recipe and persisted CVU unchanged when an edit is rejected", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id, {
      purchasePrice: "1.00",
      purchaseQuantity: "1",
      purchaseUnit: "unidad",
    });
    const product = await makeProduct(user.id, supply.id, "unidad", "1");
    const before = await persistedVariableCosts(product.id);

    await expect(
      updateProductService(
        user.id,
        product.id,
        {
          name: "No debe guardarse",
          yieldQuantity: "3",
          recipe: [{ supplyId: supply.id, quantity: "1", unit: "kg" }],
        },
        db,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    await expect(persistedVariableCosts(product.id)).resolves.toEqual(before);
    await expect(getProductService(user.id, product.id, db)).resolves.toMatchObject({
      name: product.name,
      yieldQuantity: "12",
      recipe: [{ supplyId: supply.id, quantity: "1", unit: "unidad" }],
    });
  });

  it("leaves a historical product pending without fabricating a cost", async () => {
    const user = await makeUser();
    const [business] = await db
      .insert(businesses)
      .values({ ownerUserId: user.id, name: "Negocio histórico" })
      .returning();
    if (!business) throw new Error("historical business was not created");

    const [legacy] = await db
      .insert(products)
      .values({ businessId: business.id, name: "Producto histórico" })
      .returning();
    if (!legacy) throw new Error("historical product was not created");

    await expect(persistedVariableCosts(legacy.id)).resolves.toMatchObject({
      status: "pending",
      unitAmount: null,
      unitNumerator: null,
      unitDenominator: null,
      recipeAmount: null,
      unavailableCode: null,
      calculatedAt: null,
    });
  });

  it("backfills pending products with a yield once and leaves ready results intact", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id, {
      purchasePrice: "1.00",
      purchaseQuantity: "1",
      purchaseUnit: "unidad",
    });
    const product = await makeProduct(user.id, supply.id, "unidad", "1");

    await db
      .update(products)
      .set({
        variableCostStatus: "pending",
        variableCostUnitAmount: null,
        variableCostUnitNumerator: null,
        variableCostUnitDenominator: null,
        variableCostRecipeAmount: null,
        variableCostRecipeNumerator: null,
        variableCostRecipeDenominator: null,
        variableCostUnavailableCode: null,
        variableCostCalculatedAt: null,
      })
      .where(eq(products.id, product.id));

    const businessId = await businessIdFor(user.id);
    await expect(backfillProductVariableCosts({ batchSize: 10, businessId }, db)).resolves.toEqual({
      processed: 1,
      nextAfterProductId: null,
    });
    const afterFirst = await persistedVariableCosts(product.id);
    expect(afterFirst).toMatchObject({ status: "ready", unitAmount: "0.08" });

    await expect(backfillProductVariableCosts({ batchSize: 10, businessId }, db)).resolves.toEqual({
      processed: 0,
      nextAfterProductId: null,
    });
    await expect(persistedVariableCosts(product.id)).resolves.toEqual(afterFirst);
  });

  it("normalizes a catalog alias to its canonical unit", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);

    const product = await createProductService(
      user.id,
      {
        name: "Pan flauta",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "0.25", unit: "KILOS" }],
      },
      db,
    );

    expect(product.recipe[0]?.unit).toBe("kg");
    expect(product.recipe[0]?.quantity).toBe("0.25");
  });

  it("rejects a unit from another family before writing the product", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);

    await expect(
      createProductService(
        user.id,
        {
          name: "Pan flauta",
          yieldQuantity: "12",
          recipe: [{ supplyId: supply.id, quantity: "1", unit: "L" }],
        },
        db,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    await expect(listProductsService(user.id, db)).resolves.toHaveLength(0);
  });

  it("rejects a free-text unit for a supply that uses the catalog", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);

    await expect(
      createProductService(
        user.id,
        {
          name: "Pan flauta",
          yieldQuantity: "12",
          recipe: [{ supplyId: supply.id, quantity: "1", unit: "caja" }],
        },
        db,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it.each(["bolsa", "g"])(
    "rejects the line unit %s for a supply whose unit is outside the catalog",
    async (unit) => {
      const user = await makeUser();
      const [legacy] = await db
        .insert(supplies)
        .values({
          userId: user.id,
          kind: "supply",
          name: "Harina a granel",
          purchasePrice: "1000.00",
          purchaseQuantity: "1",
          purchaseUnit: "bolsa",
        })
        .returning();

      if (!legacy) throw new Error("legacy supply was not created");

      await expect(makeProduct(user.id, legacy.id, unit, "1")).rejects.toMatchObject({
        code: "VALIDATION",
      });
    },
  );

  it("lists created products with their recipe", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);
    await makeProduct(user.id, supply.id);

    const rows = await listProductsService(user.id, db);

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Pan flauta");
    expect(rows[0].recipe).toEqual([
      {
        supplyId: supply.id,
        supplyName: supply.name,
        quantity: "250",
        unit: "g",
      },
    ]);
  });

  it("gets a product only for its owner", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const supply = await makeSupply(userA.id);
    const product = await makeProduct(userA.id, supply.id);

    expect(await getProductService(userA.id, product.id, db)).toEqual(product);
    expect(await getProductService(userB.id, product.id, db)).toBeNull();
  });

  it("updates the name and replaces the recipe", async () => {
    const user = await makeUser();
    const flour = await makeSupply(user.id, { name: "Harina 000" });
    const wholeFlour = await makeSupply(user.id, { name: "Harina integral" });
    const product = await makeProduct(user.id, flour.id);

    const updated = await updateProductService(
      user.id,
      product.id,
      {
        name: "Pan integral",
        yieldQuantity: "12",
        recipe: [{ supplyId: wholeFlour.id, quantity: "0.5", unit: "kg" }],
      },
      db,
    );

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Pan integral");
    expect(updated!.recipe).toEqual([
      {
        supplyId: wholeFlour.id,
        supplyName: wholeFlour.name,
        quantity: "0.5",
        unit: "kg",
      },
    ]);
  });

  it("persists the changed monthly capacity", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);
    const product = await makeProduct(user.id, supply.id, "g", "250", "120");

    const updated = await updateProductService(
      user.id,
      product.id,
      {
        name: product.name,
        monthlyCapacity: "200",
        yieldQuantity: "12",
        recipe: product.recipe.map((item) => ({
          supplyId: item.supplyId,
          quantity: item.quantity,
          unit: item.unit,
        })),
      },
      db,
    );

    expect(updated?.monthlyCapacity).toBe(200);
    const rows = await listProductsService(user.id, db);
    expect(rows[0]?.monthlyCapacity).toBe(200);
  });

  it("clears the monthly capacity when the update sends it empty", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);
    const product = await makeProduct(user.id, supply.id, "g", "250", "120");

    const updated = await updateProductService(
      user.id,
      product.id,
      {
        name: product.name,
        monthlyCapacity: "",
        yieldQuantity: "12",
        recipe: product.recipe.map((item) => ({
          supplyId: item.supplyId,
          quantity: item.quantity,
          unit: item.unit,
        })),
      },
      db,
    );

    expect(updated?.monthlyCapacity).toBeNull();
    const rows = await listProductsService(user.id, db);
    expect(rows[0]?.monthlyCapacity).toBeNull();
  });

  it("rejects packaging as a recipe ingredient", async () => {
    const user = await makeUser();
    const packaging = await makeSupply(user.id, {
      kind: "packaging",
      name: "Bolsa kraft",
    });

    await expect(makeProduct(user.id, packaging.id)).rejects.toMatchObject({
      code: "SUPPLY_NOT_INGREDIENT",
    });
  });

  it("rejects a supply owned by another user", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const supply = await makeSupply(userA.id);

    await expect(makeProduct(userB.id, supply.id)).rejects.toMatchObject({
      code: "SUPPLY_NOT_FOUND",
    });
  });

  it("rejects a missing supply", async () => {
    const user = await makeUser();

    await expect(makeProduct(user.id, MISSING_ID)).rejects.toMatchObject({
      code: "SUPPLY_NOT_FOUND",
    });
  });

  it("rejects a duplicated supply before writing the product", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);

    await expect(
      createProductService(
        user.id,
        {
          name: "Pan flauta",
          yieldQuantity: "12",
          recipe: [
            { supplyId: supply.id, quantity: "250", unit: "g" },
            { supplyId: supply.id, quantity: "100", unit: "g" },
          ],
        },
        db,
      ),
    ).rejects.toBeInstanceOf(ZodError);

    await expect(listProductsService(user.id, db)).resolves.toHaveLength(0);
  });

  it("soft deletes a product and hides it from the list", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);
    const product = await makeProduct(user.id, supply.id);

    expect(await deleteProductService(user.id, product.id, db)).toBe(true);
    await expect(listProductsService(user.id, db)).resolves.toHaveLength(0);
    expect(await getProductService(user.id, product.id, db)).toBeNull();
  });
  it("drops the recipe and presentations when a product is deleted", async () => {
    const user = await makeUser();
    const flour = await makeSupply(user.id);
    const box = await makeSupply(user.id, {
      kind: "packaging",
      name: "Caja",
      purchasePrice: "5000.00",
      purchaseQuantity: "50",
      purchaseUnit: "unidad",
    });
    const product = await makeProduct(user.id, flour.id);
    const presentation = await createPresentationService(
      user.id,
      product.id,
      {
        name: "Caja x6",
        unitsPerPresentation: "6",
        packaging: [{ supplyId: box.id, quantity: "1", unit: "unidad" }],
      },
      db,
    );
    expect(presentation).not.toBeNull();

    expect(await deleteProductService(user.id, product.id, db)).toBe(true);

    const [row] = await db
      .select({ isActive: products.isActive })
      .from(products)
      .where(eq(products.id, product.id));
    expect(row?.isActive).toBe(false);

    const ingredients = await db
      .select({ id: productIngredients.id })
      .from(productIngredients)
      .where(eq(productIngredients.productId, product.id));
    const presentationRows = await db
      .select({ id: presentations.id })
      .from(presentations)
      .where(eq(presentations.productId, product.id));
    const packagingRows = await db
      .select({ id: presentationPackaging.id })
      .from(presentationPackaging)
      .where(eq(presentationPackaging.presentationId, presentation!.id));

    expect(ingredients).toHaveLength(0);
    expect(presentationRows).toHaveLength(0);
    expect(packagingRows).toHaveLength(0);

    expect(await deleteSupplyService(user.id, flour.id, db)).toBe(true);
    expect(await deleteSupplyService(user.id, box.id, db)).toBe(true);
  });

  it("keeps SUPPLY_IN_USE when another active product still uses the supply", async () => {
    const user = await makeUser();
    const flour = await makeSupply(user.id);
    const deleted = await makeProduct(user.id, flour.id);
    await createProductService(
      user.id,
      {
        name: "Medialunas",
        yieldQuantity: "12",
        recipe: [{ supplyId: flour.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    expect(await deleteProductService(user.id, deleted.id, db)).toBe(true);
    await expect(deleteSupplyService(user.id, flour.id, db)).rejects.toMatchObject({
      code: "SUPPLY_IN_USE",
    });
  });

  it("keeps products isolated by owner", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const supply = await makeSupply(userA.id);
    await makeProduct(userA.id, supply.id);

    await expect(listProductsService(userB.id, db)).resolves.toHaveLength(0);
  });

  it("update of another user's product returns null", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const supply = await makeSupply(userA.id);
    const product = await makeProduct(userA.id, supply.id, "g", "250", "120");

    const updated = await updateProductService(
      userB.id,
      product.id,
      {
        name: "Hackeado",
        monthlyCapacity: "999",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "1", unit: "g" }],
      },
      db,
    );

    expect(updated).toBeNull();
    const rows = await listProductsService(userA.id, db);
    expect(rows[0].name).toBe("Pan flauta");
    expect(rows[0].monthlyCapacity).toBe(120);
  });

  it("rejects a unit from another family on update", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);
    const product = await makeProduct(user.id, supply.id);

    await expect(
      updateProductService(
        user.id,
        product.id,
        {
          name: product.name,
          yieldQuantity: "12",
          recipe: [{ supplyId: supply.id, quantity: "1", unit: "L" }],
        },
        db,
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      details: {
        fieldErrors: { recipe: ["Elegí una unidad de medida de la misma familia que el insumo."] },
      },
    });
  });

  it("rejects a catalog unit for a supply that predates the catalog", async () => {
    const user = await makeUser();
    const [legacy] = await db
      .insert(supplies)
      .values({
        userId: user.id,
        kind: "supply",
        name: "Harina a granel",
        purchasePrice: "1000.00",
        purchaseQuantity: "1",
        purchaseUnit: "bolsa",
      })
      .returning();

    if (!legacy) throw new Error("legacy supply was not created");

    await expect(
      makeProduct(user.id, legacy.id, "g", "1"),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("reports the cross-family rejection as a recipe field error on create", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);

    await expect(
      createProductService(
        user.id,
        {
          name: "Pan flauta",
          yieldQuantity: "12",
          recipe: [{ supplyId: supply.id, quantity: "1", unit: "L" }],
        },
        db,
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      details: {
        fieldErrors: { recipe: ["Elegí una unidad de medida de la misma familia que el insumo."] },
      },
    });
  });
});
