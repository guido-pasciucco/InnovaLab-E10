import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod/v4";

import { eq, sql } from "drizzle-orm";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { productIngredients } from "@/lib/db/business/table";
import { supplies } from "@/lib/db/supplies/table";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import {
  createProductService,
  deleteProductService,
  getProductService,
  listProductsService,
  updateProductService,
} from "./products";
import { createSupplyService } from "./supplies";

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
  minimumUnit: string;
  conversionFactor: string;
};

const validSupply: SupplyInput = {
  kind: "supply",
  name: "Harina 000",
  purchasePrice: "18750.00",
  purchaseQuantity: "25",
  purchaseUnit: "kg",
  minimumUnit: "g",
  conversionFactor: "1000",
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
) {
  return createProductService(
    userId,
    {
      name: "Pan flauta",
      recipe: [{ supplyId, quantity, unit }],
    },
    db,
  );
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
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    expect(product.name).toBe("Pan flauta");
    expect(product.recipe).toEqual([
      {
        supplyId: supply.id,
        supplyName: supply.name,
        quantity: "250",
        unit: "g",
      },
    ]);
  });

  it("normalizes a catalog alias to its canonical unit", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);

    const product = await createProductService(
      user.id,
      {
        name: "Pan flauta",
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
          recipe: [{ supplyId: supply.id, quantity: "1", unit: "caja" }],
        },
        db,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("preserves a legacy unit when the supply predates the catalog", async () => {
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
        minimumUnit: "bolsa",
        conversionFactor: "1",
      })
      .returning();

    if (!legacy) throw new Error("legacy supply was not created");

    const product = await makeProduct(user.id, legacy.id, "bolsa", "1");

    expect(product.recipe[0]).toEqual({
      supplyId: legacy.id,
      supplyName: legacy.name,
      quantity: "1",
      unit: "bolsa",
    });
  });

  it("rejects a different free-text unit for a legacy supply", async () => {
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
        minimumUnit: "bolsa",
        conversionFactor: "1",
      })
      .returning();

    if (!legacy) throw new Error("legacy supply was not created");

    await expect(
      makeProduct(user.id, legacy.id, "caja", "1"),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

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
    const product = await makeProduct(userA.id, supply.id);

    const updated = await updateProductService(
      userB.id,
      product.id,
      {
        name: "Hackeado",
        recipe: [{ supplyId: supply.id, quantity: "1", unit: "g" }],
      },
      db,
    );

    expect(updated).toBeNull();
    const rows = await listProductsService(userA.id, db);
    expect(rows[0].name).toBe("Pan flauta");
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
        minimumUnit: "bolsa",
        conversionFactor: "1",
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

  it("backfills unit from the supply's minimum unit", async () => {
    const user = await makeUser();
    const supply = await makeSupply(user.id);
    const product = await makeProduct(user.id, supply.id);

    await db
      .update(productIngredients)
      .set({ unit: null })
      .where(eq(productIngredients.productId, product.id));

    await db.execute(sql`
      UPDATE "product_ingredients" AS "pi"
      SET "unit" = "s"."minimum_unit"
      FROM "supplies" AS "s"
      WHERE "pi"."supply_id" = "s"."id"
    `);

    const rows = await db
      .select()
      .from(productIngredients)
      .where(eq(productIngredients.productId, product.id));

    expect(rows[0]?.unit).toBe(supply.minimumUnit);
  });
});
