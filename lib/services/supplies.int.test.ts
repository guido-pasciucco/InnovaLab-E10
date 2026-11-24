import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { eq, sql } from "drizzle-orm";
import { products } from "@/lib/db/business/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { supplies } from "@/lib/db/supplies/table";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { createProductService, getProductService, updateProductService } from "./products";
import { backfillProductVariableCosts } from "./product-variable-cost-backfill";
import {
  createSupplyService,
  deleteSupplyService,
  listSuppliesService,
  updateSupplyService,
} from "./supplies";

// Integration tests against the local Supabase stack (.env.test URLs are
// local-only; loadTestEnv throws otherwise). One db client (one postgres-js
// pool) per file, closed in afterAll; users are removed (profile + auth user)
// after each test, cascading their supplies rows.

const validInput = {
  kind: "supply",
  name: "Harina 000",
  purchasePrice: "18750.00",
  purchaseQuantity: "25",
  purchaseUnit: "kg",
  minimumUnit: "g",
  conversionFactor: "1000",
} as const;

let db: Db;
const users: CreatedUser[] = [];

beforeAll(() => {
  process.env.DATABASE_URL = loadTestEnv().DATABASE_URL;
  // Drop any singleton built from another DATABASE_URL so this file's
  // client points at the local stack.
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

// Attempts every deletion even if one fails, then reports all failures.
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

// Rows created before the catalog rollout may hold a free-text unit. New
// supplies cannot be created with one anymore, so tests insert it directly.
async function insertLegacySupply(userId: string) {
  const [row] = await db
    .insert(supplies)
    .values({
      userId,
      kind: "supply",
      name: "Harina vieja",
      purchasePrice: "1000.00",
      purchaseQuantity: "1",
      purchaseUnit: "bolsa",
      minimumUnit: "unidad",
      conversionFactor: "1",
    })
    .returning();

  if (!row) throw new Error("insertLegacySupply: no row returned");
  return row;
}

describe("supplies service", () => {
  it("lists empty when the user has no supplies", async () => {
    const user = await makeUser();

    const rows = await listSuppliesService(user.id, db);
    expect(rows).toHaveLength(0);
  });

  it("creates a supply and returns it", async () => {
    const user = await makeUser();

    const supply = await createSupplyService(user.id, validInput, db);

    expect(supply.name).toBe(validInput.name);
    expect(supply.purchasePrice).toBe(validInput.purchasePrice);
    expect(supply.kind).toBe(validInput.kind);
    expect(supply.purchaseQuantity).toBe("25.0000");
    expect(supply.purchaseUnit).toBe(validInput.purchaseUnit);
    expect(supply.minimumUnit).toBe(validInput.minimumUnit);
    expect(supply.conversionFactor).toBe("1000.0000");
    expect(supply.userId).toBe(user.id);
    expect(supply.id).toBeDefined();
  });

  it("creates packaging with the same shape as a supply", async () => {
    const user = await makeUser();

    const supply = await createSupplyService(
      user.id,
      { ...validInput, kind: "packaging", name: "Bolsa kraft" },
      db,
    );

    expect(supply.kind).toBe("packaging");
    expect(supply.name).toBe("Bolsa kraft");
  });

  it("derives the minimum unit and factor from the selected supply unit", async () => {
    const user = await makeUser();

    const supply = await createSupplyService(
      user.id,
      {
        ...validInput,
        purchaseUnit: "L",
        minimumUnit: "L",
        conversionFactor: "1",
      },
      db,
    );

    expect(supply.purchaseUnit).toBe("L");
    expect(supply.minimumUnit).toBe("ml");
    expect(supply.conversionFactor).toBe("1000.0000");
  });

  it("rejects a purchase unit outside the catalog when creating a supply", async () => {
    const user = await makeUser();

    await expect(
      createSupplyService(user.id, { ...validInput, purchaseUnit: "caja" }, db),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("derives the technical units even if the payload manipulates them", async () => {
    const user = await makeUser();

    const supply = await createSupplyService(
      user.id,
      {
        ...validInput,
        minimumUnit: "caja",
        conversionFactor: "999",
      },
      db,
    );

    expect(supply.minimumUnit).toBe("g");
    expect(supply.conversionFactor).toBe("1000.0000");
  });

  it("derives packaging technical units from the catalog", async () => {
    const user = await makeUser();

    const supply = await createSupplyService(
      user.id,
      {
        ...validInput,
        kind: "packaging",
        name: "Bolsa kraft",
        purchaseUnit: "docena",
        minimumUnit: "bolsa",
        conversionFactor: "100",
      },
      db,
    );

    expect(supply.purchaseUnit).toBe("docena");
    expect(supply.minimumUnit).toBe("unidad");
    expect(supply.conversionFactor).toBe("12.0000");
  });

  it("rejects packaging with a unit outside the catalog", async () => {
    const user = await makeUser();

    await expect(
      createSupplyService(
        user.id,
        { ...validInput, kind: "packaging", name: "Bolsa kraft", purchaseUnit: "caja" },
        db,
      ),
    ).rejects.toMatchObject({ name: "ZodError" });
  });

  it("capitalizes the first letter of the name", async () => {
    const user = await makeUser();

    const supply = await createSupplyService(
      user.id,
      { ...validInput, name: "harina 000" },
      db,
    );

    expect(supply.name).toBe("Harina 000");
  });

  it("lists created supplies", async () => {
    const user = await makeUser();
    await createSupplyService(user.id, validInput, db);

    const rows = await listSuppliesService(user.id, db);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe(validInput.name);
  });

  it("updates a supply", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);

    const updated = await updateSupplyService(user.id, supply.id, {
      ...validInput,
      name: "Harina integral",
      purchasePrice: "22000.00",
    }, db);

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Harina integral");
    expect(updated!.purchasePrice).toBe("22000.00");
    expect(updated!.purchaseQuantity).toBe("25.0000");
  });

  it("preserves a legacy unit and ignores manipulated technical values on edit", async () => {
    const user = await makeUser();
    const legacy = await insertLegacySupply(user.id);

    const updated = await updateSupplyService(
      user.id,
      legacy.id,
      {
        kind: "supply",
        name: "Harina vieja",
        purchasePrice: "2000.00",
        purchaseQuantity: "1",
        purchaseUnit: "bolsa",
        minimumUnit: "caja",
        conversionFactor: "999",
      },
      db,
    );

    expect(updated).not.toBeNull();
    expect(updated!.purchaseUnit).toBe("bolsa");
    expect(updated!.minimumUnit).toBe("unidad");
    expect(updated!.conversionFactor).toBe("1.0000");
  });

  it("rejects changing a legacy unit to another unknown unit", async () => {
    const user = await makeUser();
    const legacy = await insertLegacySupply(user.id);

    await expect(
      updateSupplyService(
        user.id,
        legacy.id,
        { ...validInput, name: "Harina vieja", purchaseUnit: "caja" },
        db,
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      details: {
        fieldErrors: {
          purchaseUnit: ["Elegí una unidad de compra del catálogo."],
        },
      },
    });
  });

  it("migrates a legacy unit when the edit picks a catalog unit", async () => {
    const user = await makeUser();
    const legacy = await insertLegacySupply(user.id);

    const updated = await updateSupplyService(
      user.id,
      legacy.id,
      {
        ...validInput,
        name: "Harina vieja",
        purchaseUnit: "kg",
        minimumUnit: "caja",
        conversionFactor: "999",
      },
      db,
    );

    expect(updated).not.toBeNull();
    expect(updated!.purchaseUnit).toBe("kg");
    expect(updated!.minimumUnit).toBe("g");
    expect(updated!.conversionFactor).toBe("1000.0000");
  });

  it("rejects an unknown unit when editing a supply that uses the catalog", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);

    await expect(
      updateSupplyService(user.id, supply.id, { ...validInput, purchaseUnit: "caja" }, db),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      details: {
        fieldErrors: {
          purchaseUnit: ["Elegí una unidad de compra del catálogo."],
        },
      },
    });
  });

  it("deletes a supply", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);

    const deleted = await deleteSupplyService(user.id, supply.id, db);
    expect(deleted).toBe(true);

    const rows = await listSuppliesService(user.id, db);
    expect(rows).toHaveLength(0);
  });

  it("delete returns null when supply does not exist", async () => {
    const user = await makeUser();

    const deleted = await deleteSupplyService(user.id, "00000000-0000-0000-0000-000000000000", db);
    expect(deleted).toBe(false);
  });

  it("users do not see each other's supplies", async () => {
    const userA = await makeUser();
    const userB = await makeUser();

    await createSupplyService(userA.id, validInput, db);

    const rowsA = await listSuppliesService(userA.id, db);
    const rowsB = await listSuppliesService(userB.id, db);

    expect(rowsA).toHaveLength(1);
    expect(rowsB).toHaveLength(0);
  });

  it("update of another user's supply returns null", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const supply = await createSupplyService(userA.id, validInput, db);

    const updated = await updateSupplyService(userB.id, supply.id, {
      ...validInput,
      name: "Hackeado",
      purchasePrice: "999999.00",
    }, db);

    expect(updated).toBeNull();

    const rows = await listSuppliesService(userA.id, db);
    expect(rows[0].name).toBe(validInput.name);
  });

  it("delete of another user's supply returns false", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const supply = await createSupplyService(userA.id, validInput, db);

    const deleted = await deleteSupplyService(userB.id, supply.id, db);
    expect(deleted).toBe(false);

    const rows = await listSuppliesService(userA.id, db);
    expect(rows).toHaveLength(1);
  });

  it("does not reveal whether another user's supply is used by a recipe", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const supply = await createSupplyService(userA.id, validInput, db);
    await createProductService(
      userA.id,
      {
        name: "Pan flauta",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    await expect(deleteSupplyService(userB.id, supply.id, db)).resolves.toBe(false);

    const rows = await listSuppliesService(userA.id, db);
    expect(rows).toHaveLength(1);
  });

  it("blocks deleting a supply used by a recipe", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);
    await createProductService(
      user.id,
      {
        name: "Pan flauta",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    await expect(deleteSupplyService(user.id, supply.id, db)).rejects.toMatchObject({
      code: "SUPPLY_IN_USE",
    });

    await expect(listSuppliesService(user.id, db)).resolves.toHaveLength(1);
  });

  it("blocks changing the minimum unit of a supply used by a recipe", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);
    await createProductService(
      user.id,
      {
        name: "Pan flauta",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    // The minimum unit is derived from the purchase unit: kg (g) -> L (ml)
    // changes what the recipe quantity means and must be blocked.
    await expect(
      updateSupplyService(user.id, supply.id, { ...validInput, purchaseUnit: "L" }, db),
    ).rejects.toMatchObject({ code: "SUPPLY_IN_USE" });
  });

  it("blocks changing the kind of a supply used by a recipe", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);
    await createProductService(
      user.id,
      {
        name: "Pan flauta",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    await expect(
      updateSupplyService(user.id, supply.id, { ...validInput, kind: "packaging" }, db),
    ).rejects.toMatchObject({ code: "SUPPLY_IN_USE" });
  });

  it("allows price and cost changes while the supply is used by a recipe", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);
    await createProductService(
      user.id,
      {
        name: "Pan flauta",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    const updated = await updateSupplyService(
      user.id,
      supply.id,
      {
        ...validInput,
        name: "Harina premium",
        purchasePrice: "22000.00",
        purchaseUnit: "g",
        conversionFactor: "900",
      },
      db,
    );

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Harina premium");
    expect(updated!.purchasePrice).toBe("22000.00");
    expect(updated!.conversionFactor).toBe("1.0000");
  });

  it("recalculates every active product that uses an updated supply", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);
    const first = await createProductService(
      user.id,
      {
        name: "Pan chico",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );
    const second = await createProductService(
      user.id,
      {
        name: "Pan grande",
        yieldQuantity: "6",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    await updateSupplyService(
      user.id,
      supply.id,
      { ...validInput, purchasePrice: "37500.00" },
      db,
    );

    await expect(getProductService(user.id, first.id, db)).resolves.toMatchObject({
      variableCosts: { unitCost: "31.25", exact: { unitCost: { numerator: "125", denominator: "4" } } },
    });
    await expect(getProductService(user.id, second.id, db)).resolves.toMatchObject({
      variableCosts: { unitCost: "62.50", exact: { unitCost: { numerator: "125", denominator: "2" } } },
    });
    await expect(
      db
        .select({ first: products.variableCostUnitAmount, second: products.variableCostStatus })
        .from(products)
        .where(eq(products.id, first.id)),
    ).resolves.toEqual([{ first: "31.25", second: "ready" }]);
  });

  it("recalculates CVU when purchase quantity changes", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);
    const product = await createProductService(
      user.id,
      {
        name: "Pan chico",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    const initial = await getProductService(user.id, product.id, db);
    expect(initial?.variableCosts?.unitCost).toBe("15.63");

    await updateSupplyService(
      user.id,
      supply.id,
      { ...validInput, purchaseQuantity: "50" },
      db,
    );

    const updated = await getProductService(user.id, product.id, db);
    expect(updated?.variableCosts?.unitCost).toBe("7.81");
    await expect(
      db
        .select({ amount: products.variableCostUnitAmount, status: products.variableCostStatus })
        .from(products)
        .where(eq(products.id, product.id)),
    ).resolves.toEqual([{ amount: "7.81", status: "ready" }]);
  });

  it("recalculates CVU when purchase unit changes within the same family", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);
    const product = await createProductService(
      user.id,
      {
        name: "Pan chico",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    const initial = await getProductService(user.id, product.id, db);
    expect(initial?.variableCosts?.unitCost).toBe("15.63");

    await updateSupplyService(
      user.id,
      supply.id,
      { ...validInput, purchaseUnit: "g" },
      db,
    );

    const updated = await getProductService(user.id, product.id, db);
    // New: purchasePrice 18750 / purchaseQuantity 25 * (250/1) / 12 = 15625.00
    expect(updated?.variableCosts?.unitCost).toBe("15625.00");
  });

  it("recalculates CVU when conversion factor changes via unit change", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);
    const product = await createProductService(
      user.id,
      {
        name: "Pan chico",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    const initial = await getProductService(user.id, product.id, db);
    expect(initial?.variableCosts?.unitCost).toBe("15.63");

    // Change from kg (factor 1000) to g (factor 1) — conversion factor changes
    await updateSupplyService(
      user.id,
      supply.id,
      { ...validInput, purchaseUnit: "g" },
      db,
    );

    const updated = await getProductService(user.id, product.id, db);
    expect(updated?.variableCosts?.unitCost).toBe("15625.00");
  });

  it("rolls back supply and CVU when update fails with SUPPLY_IN_USE", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);
    const product = await createProductService(
      user.id,
      {
        name: "Pan chico",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    const beforeSupply = await db
      .select({ price: supplies.purchasePrice })
      .from(supplies)
      .where(eq(supplies.id, supply.id));
    const beforeCvu = await db
      .select({ amount: products.variableCostUnitAmount })
      .from(products)
      .where(eq(products.id, product.id));

    // Attempt a recipe-meaning change (kind change) while supply is in use
    await expect(
      updateSupplyService(
        user.id,
        supply.id,
        { ...validInput, kind: "packaging" },
        db,
      ),
    ).rejects.toMatchObject({ code: "SUPPLY_IN_USE" });

    // Supply should not be updated
    const afterSupply = await db
      .select({ price: supplies.purchasePrice })
      .from(supplies)
      .where(eq(supplies.id, supply.id));
    expect(afterSupply).toEqual(beforeSupply);

    // CVU should not be changed
    const afterCvu = await db
      .select({ amount: products.variableCostUnitAmount })
      .from(products)
      .where(eq(products.id, product.id));
    expect(afterCvu).toEqual(beforeCvu);
  });

  it("handles concurrent recipe edit and price update without corrupting CVU", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);
    const product = await createProductService(
      user.id,
      {
        name: "Pan chico",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    // Run price update and recipe edit concurrently
    await Promise.all([
      updateSupplyService(
        user.id,
        supply.id,
        { ...validInput, purchasePrice: "37500.00" },
        db,
      ),
      updateProductService(
        user.id,
        product.id,
        {
          name: "Pan chico",
          yieldQuantity: "12",
          recipe: [{ supplyId: supply.id, quantity: "500", unit: "g" }],
        },
        db,
      ),
    ]);

    // Final CVU should reflect both changes: (37500/25) * (500/1000) / 12 = 62.50
    const final = await getProductService(user.id, product.id, db);
    expect(final?.variableCosts?.unitCost).toBe("62.50");
  });

  it("isolates CVU recalculation between users", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const supplyA = await createSupplyService(userA.id, validInput, db);
    const supplyB = await createSupplyService(userB.id, { ...validInput, name: "Harina B" }, db);
    await createProductService(
      userA.id,
      {
        name: "Pan A",
        yieldQuantity: "12",
        recipe: [{ supplyId: supplyA.id, quantity: "250", unit: "g" }],
      },
      db,
    );
    const productB = await createProductService(
      userB.id,
      {
        name: "Pan B",
        yieldQuantity: "12",
        recipe: [{ supplyId: supplyB.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    const beforeB = await getProductService(userB.id, productB.id, db);

    // User A updates their supply price
    await updateSupplyService(
      userA.id,
      supplyA.id,
      { ...validInput, purchasePrice: "37500.00" },
      db,
    );

    // User B's product CVU should be unchanged
    const afterB = await getProductService(userB.id, productB.id, db);
    expect(afterB?.variableCosts?.unitCost).toBe(beforeB?.variableCosts?.unitCost);
  });

  it("backfill is idempotent for pending, ready and legacy products", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);

    // Product with yield (will become ready after backfill)
    const productWithYield = await createProductService(
      user.id,
      {
        name: "Con rendimiento",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    // Manually set status to pending to simulate a product that hasn't been calculated
    // Must clear CVU columns to satisfy the CHECK constraint
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
      .where(eq(products.id, productWithYield.id));

    // Legacy product without yield (should remain pending)
    const [legacyProduct] = await db
      .insert(products)
      .values({
        businessId: (await db.select({ id: (await import("@/lib/db/business/table")).businesses.id }).from((await import("@/lib/db/business/table")).businesses).where(eq((await import("@/lib/db/business/table")).businesses.ownerUserId, user.id)).limit(1))[0].id,
        name: "Legacy sin rendimiento",
        yieldQuantity: null,
        variableCostStatus: "pending",
        isActive: true,
      })
      .returning();

    if (!legacyProduct) throw new Error("legacy product was not created");

    const [business] = await db
      .select({ id: (await import("@/lib/db/business/table")).businesses.id })
      .from((await import("@/lib/db/business/table")).businesses)
      .where(eq((await import("@/lib/db/business/table")).businesses.ownerUserId, user.id))
      .limit(1);
    if (!business) throw new Error("test business was not created");

    // Scope the operational backfill to this test's business. Other test files
    // may legitimately create pending legacy rows in the shared test database.
    const result1 = await backfillProductVariableCosts({ batchSize: 10, businessId: business.id }, db);
    expect(result1).toEqual({ processed: 2, nextAfterProductId: null });

    // Product with yield should now be ready
    const afterBackfill = await db
      .select({ status: products.variableCostStatus })
      .from(products)
      .where(eq(products.id, productWithYield.id));
    expect(afterBackfill[0]?.status).toBe("ready");

    // Legacy product should now be unavailable with MISSING_YIELD
    const legacyAfter = await db
      .select({ status: products.variableCostStatus, code: products.variableCostUnavailableCode })
      .from(products)
      .where(eq(products.id, legacyProduct.id));
    expect(legacyAfter[0]?.status).toBe("unavailable");
    expect(legacyAfter[0]?.code).toBe("MISSING_YIELD");

    // Run backfill again (idempotent)
    await expect(
      backfillProductVariableCosts({ batchSize: 10, businessId: business.id }, db),
    ).resolves.toEqual({ processed: 0, nextAfterProductId: null });

    // Product with yield should still be ready (no change)
    const afterSecond = await db
      .select({ status: products.variableCostStatus })
      .from(products)
      .where(eq(products.id, productWithYield.id));
    expect(afterSecond[0]?.status).toBe("ready");
  });

  it("rolls back supply and CVU when a transactional write fails", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);
    const product = await createProductService(
      user.id,
      {
        name: "Pan chico",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    // Capture state before the failed update
    const beforeSupply = await db
      .select({ price: supplies.purchasePrice })
      .from(supplies)
      .where(eq(supplies.id, supply.id));
    const beforeCvu = await db
      .select({ amount: products.variableCostUnitAmount, status: products.variableCostStatus })
      .from(products)
      .where(eq(products.id, product.id));

    // Attempt a recipe-meaning change (kind change) while supply is in use
    // This should throw SUPPLY_IN_USE inside the transaction, triggering rollback
    await expect(
      updateSupplyService(
        user.id,
        supply.id,
        { ...validInput, kind: "packaging" },
        db,
      ),
    ).rejects.toMatchObject({ code: "SUPPLY_IN_USE" });

    // Supply should not be updated (rollback)
    const afterSupply = await db
      .select({ price: supplies.purchasePrice })
      .from(supplies)
      .where(eq(supplies.id, supply.id));
    expect(afterSupply).toEqual(beforeSupply);

    // CVU should not be changed (rollback)
    const afterCvu = await db
      .select({ amount: products.variableCostUnitAmount, status: products.variableCostStatus })
      .from(products)
      .where(eq(products.id, product.id));
    expect(afterCvu).toEqual(beforeCvu);
  });

  it("marks legacy products as unavailable with MISSING_YIELD during backfill", async () => {
    const user = await makeUser();

    // Create a legacy product directly (no yield)
    const business = await db
      .select({ id: (await import("@/lib/db/business/table")).businesses.id })
      .from((await import("@/lib/db/business/table")).businesses)
      .where(eq((await import("@/lib/db/business/table")).businesses.ownerUserId, user.id))
      .limit(1);

    if (business.length === 0) {
      // Create a supply and product first to establish a business
      const tempSupply = await createSupplyService(user.id, validInput, db);
      await createProductService(
        user.id,
        {
          name: "Temp product",
          yieldQuantity: "1",
          recipe: [{ supplyId: tempSupply.id, quantity: "1", unit: "g" }],
        },
        db,
      );
    }

    const biz = await db
      .select({ id: (await import("@/lib/db/business/table")).businesses.id })
      .from((await import("@/lib/db/business/table")).businesses)
      .where(eq((await import("@/lib/db/business/table")).businesses.ownerUserId, user.id))
      .limit(1);

    const [legacyProduct] = await db
      .insert((await import("@/lib/db/business/table")).products)
      .values({
        businessId: biz[0].id,
        name: "Legacy sin rendimiento",
        yieldQuantity: null,
        variableCostStatus: "pending",
        isActive: true,
      })
      .returning();

    if (!legacyProduct) throw new Error("legacy product was not created");

    // Scope the backfill so unrelated pending rows cannot affect this test.
    await backfillProductVariableCosts({ batchSize: 10, businessId: biz[0].id }, db);

    // Legacy product should remain pending (no yield to calculate)
    const after = await db
      .select({ status: (await import("@/lib/db/business/table")).products.variableCostStatus, code: (await import("@/lib/db/business/table")).products.variableCostUnavailableCode })
      .from((await import("@/lib/db/business/table")).products)
      .where(eq((await import("@/lib/db/business/table")).products.id, legacyProduct.id));
    expect(after[0]?.status).toBe("unavailable");
    expect(after[0]?.code).toBe("MISSING_YIELD");
  });

  it("releases a supply after the recipe stops using it", async () => {
    const user = await makeUser();
    const used = await createSupplyService(user.id, validInput, db);
    const other = await createSupplyService(
      user.id,
      { ...validInput, name: "Harina integral" },
      db,
    );
    const product = await createProductService(
      user.id,
      {
        name: "Pan flauta",
        yieldQuantity: "12",
        recipe: [{ supplyId: used.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    await updateProductService(
      user.id,
      product.id,
      {
        name: "Pan flauta",
        yieldQuantity: "12",
        recipe: [{ supplyId: other.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    await expect(deleteSupplyService(user.id, used.id, db)).resolves.toBe(true);
  });

  it("rolls back supply write and CVU when a post-write DB operation fails", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);
    const product = await createProductService(
      user.id,
      {
        name: "Pan chico",
        yieldQuantity: "12",
        recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
      },
      db,
    );

    // Capture state before the failed update
    const beforeSupply = await db
      .select({ price: supplies.purchasePrice })
      .from(supplies)
      .where(eq(supplies.id, supply.id));
    const beforeCvu = await db
      .select({ amount: products.variableCostUnitAmount, status: products.variableCostStatus })
      .from(products)
      .where(eq(products.id, product.id));

    // Create a trigger that raises an exception on UPDATE of products.
    // This simulates a failure AFTER the supply write but DURING CVU recalculation.
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION test_rollback_trigger()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'forced rollback for testing';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await db.execute(sql`
      CREATE TRIGGER test_rollback_trigger
      BEFORE UPDATE ON products
      FOR EACH ROW
      EXECUTE FUNCTION test_rollback_trigger();
    `);

    try {
      // Attempt to update the supply (price change). The supply write succeeds,
      // but the CVU recalculation (UPDATE products) triggers the trigger,
      // causing the entire transaction to roll back.
      await expect(
        updateSupplyService(
          user.id,
          supply.id,
          { ...validInput, purchasePrice: "37500.00" },
          db,
        ),
      ).rejects.toThrow();

      // Supply should NOT be updated (rollback)
      const afterSupply = await db
        .select({ price: supplies.purchasePrice })
        .from(supplies)
        .where(eq(supplies.id, supply.id));
      expect(afterSupply).toEqual(beforeSupply);

      // CVU should NOT be changed (rollback)
      const afterCvu = await db
        .select({ amount: products.variableCostUnitAmount, status: products.variableCostStatus })
        .from(products)
        .where(eq(products.id, product.id));
      expect(afterCvu).toEqual(beforeCvu);
    } finally {
      // Clean up the trigger
      await db.execute(sql`DROP TRIGGER IF EXISTS test_rollback_trigger ON products;`);
      await db.execute(sql`DROP FUNCTION IF EXISTS test_rollback_trigger();`);
    }
  });
});
