import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { supplies } from "@/lib/db/supplies/table";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { createProductService, updateProductService } from "./products";
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

  it("keeps the technical units of packaging", async () => {
    const user = await makeUser();

    const supply = await createSupplyService(
      user.id,
      {
        ...validInput,
        kind: "packaging",
        name: "Bolsa kraft",
        purchaseUnit: "caja",
        minimumUnit: "bolsa",
        conversionFactor: "100",
      },
      db,
    );

    expect(supply.minimumUnit).toBe("bolsa");
    expect(supply.conversionFactor).toBe("100.0000");
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
        recipe: [{ supplyId: supply.id, quantity: "250" }],
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
        recipe: [{ supplyId: supply.id, quantity: "250" }],
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
        recipe: [{ supplyId: supply.id, quantity: "250" }],
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
        recipe: [{ supplyId: supply.id, quantity: "250" }],
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
        recipe: [{ supplyId: supply.id, quantity: "250" }],
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
        recipe: [{ supplyId: used.id, quantity: "250" }],
      },
      db,
    );

    await updateProductService(
      user.id,
      product.id,
      {
        name: "Pan flauta",
        yieldQuantity: "12",
        recipe: [{ supplyId: other.id, quantity: "250" }],
      },
      db,
    );

    await expect(deleteSupplyService(user.id, used.id, db)).resolves.toBe(true);
  });
});
