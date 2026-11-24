import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { businesses, products } from "@/lib/db/business/table";
import { eq } from "drizzle-orm";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { addPeriodCostLineService } from "./business-cost";
import { getCostDistributionService } from "./cost-distribution";
import { createProductService } from "./products";
import { createSupplyService } from "./supplies";

// Integration tests against the local Supabase stack. One db client per file;
// deleteUser cascades the business, its products and the period expenses.

const flour = {
  kind: "supply" as const,
  name: "Harina 000",
  purchasePrice: "18750.00",
  purchaseQuantity: "25",
  purchaseUnit: "kg",
  minimumUnit: "g",
  conversionFactor: "1000",
};

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

// Variable cost per unit with the flour above: 0.75 per gram.
async function makeProduct(
  user: CreatedUser,
  supplyId: string,
  input: { name: string; capacity: number | null; grams: string; yieldQuantity: string },
) {
  return createProductService(
    user.id,
    {
      name: input.name,
      monthlyCapacity: input.capacity,
      yieldQuantity: input.yieldQuantity,
      recipe: [{ supplyId, quantity: input.grams, unit: "g" }],
    },
    db,
  );
}

async function addExpenses(user: CreatedUser, ...amounts: string[]) {
  for (const [index, amountPeriod] of amounts.entries()) {
    await addPeriodCostLineService(user.id, { concept: `Gasto ${index + 1}`, amountPeriod }, db);
  }
}

describe("getCostDistributionService", () => {
  it("spreads the period expenses by capacity and adds the variable cost", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, flour, db);
    await makeProduct(user, supply.id, { name: "Pan", capacity: 180, grams: "250", yieldQuantity: "12" });
    await makeProduct(user, supply.id, { name: "Facturas", capacity: 20, grams: "100", yieldQuantity: "1" });
    await addExpenses(user, "300000", "30000");

    const result = await getCostDistributionService(user.id, {}, db);

    expect(result.status).toBe("ready");
    expect(result.totalExpenses).toBe("330000.00");
    // 330.000 / (180 + 20) = 1650 per unit for every product.
    expect(result.rows).toMatchObject([
      {
        name: "Pan",
        capacity: 180,
        absorbsExpenses: true,
        share: "0.9000",
        // 250 g * 0.75 / 12 = 15.625, added exact: 1665.625 -> 1665.63.
        indirectUnit: "1650.00",
        unitCost: "1665.63",
        fixedShare: "297000.00",
      },
      {
        name: "Facturas",
        capacity: 20,
        absorbsExpenses: true,
        share: "0.1000",
        variableUnit: "75.00",
        indirectUnit: "1650.00",
        unitCost: "1725.00",
        fixedShare: "33000.00",
      },
    ]);
  });

  it("makes the product with the higher capacity absorb more pesos", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, flour, db);
    await makeProduct(user, supply.id, { name: "Grande", capacity: 300, grams: "10", yieldQuantity: "1" });
    await makeProduct(user, supply.id, { name: "Chico", capacity: 100, grams: "10", yieldQuantity: "1" });
    await addExpenses(user, "400000");

    const result = await getCostDistributionService(user.id, {}, db);

    const [big, small] = result.rows;
    expect(big.fixedShare).toBe("300000.00");
    expect(small.fixedShare).toBe("100000.00");
    // The same rate per unit, so the same total cost for the same recipe.
    expect(big.unitCost).toBe(small.unitCost);
  });

  it("shows no total cost while no product has a capacity loaded", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, flour, db);
    await makeProduct(user, supply.id, { name: "Pan", capacity: null, grams: "250", yieldQuantity: "12" });
    await makeProduct(user, supply.id, { name: "Facturas", capacity: 0, grams: "100", yieldQuantity: "1" });
    await addExpenses(user, "100000");

    const result = await getCostDistributionService(user.id, {}, db);

    expect(result.status).toBe("no_capacity");
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((row) => !row.absorbsExpenses && row.unitCost === null)).toBe(true);
  });

  it("leaves out of the prorrateo a product without capacity", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, flour, db);
    await makeProduct(user, supply.id, { name: "Pan", capacity: 100, grams: "100", yieldQuantity: "1" });
    await makeProduct(user, supply.id, { name: "Sin capacidad", capacity: null, grams: "100", yieldQuantity: "1" });
    await addExpenses(user, "5000");

    const result = await getCostDistributionService(user.id, {}, db);

    expect(result.status).toBe("ready");
    expect(result.rows[0]).toMatchObject({ name: "Pan", share: "1.0000", fixedShare: "5000.00" });
    expect(result.rows[1]).toMatchObject({
      name: "Sin capacidad",
      absorbsExpenses: false,
      fixedShare: null,
      unitCost: null,
    });
  });

  it("shows no total cost when the period has no expenses", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, flour, db);
    await makeProduct(user, supply.id, { name: "Pan", capacity: 100, grams: "100", yieldQuantity: "1" });

    const result = await getCostDistributionService(user.id, {}, db);

    expect(result).toMatchObject({ status: "no_expenses", totalExpenses: "0.00" });
    expect(result.rows[0]).toMatchObject({ capacity: 100, unitCost: null, absorbsExpenses: false });
  });

  it("keeps the share of a product whose variable cost is not available, without a total", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, flour, db);
    await makeProduct(user, supply.id, { name: "Pan", capacity: 90, grams: "100", yieldQuantity: "1" });
    const [business] = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.ownerUserId, user.id))
      .limit(1);
    await db.insert(products).values({
      name: "Sin receta",
      monthlyCapacity: 10,
      yieldQuantity: 1,
      businessId: business.id,
      isActive: true,
    });
    await addExpenses(user, "10000");

    const result = await getCostDistributionService(user.id, {}, db);

    expect(result.status).toBe("ready");
    expect(result.rows[0]).toMatchObject({ name: "Pan", indirectUnit: "100.00", unitCost: "175.00" });
    expect(result.rows[1]).toMatchObject({
      name: "Sin receta",
      absorbsExpenses: true,
      fixedShare: "1000.00",
      variableUnit: null,
      unitCost: null,
    });
  });

  it("is unavailable when capacity and expenses exist but no product has a variable cost", async () => {
    const user = await makeUser();
    await addExpenses(user, "10000");
    const [business] = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.ownerUserId, user.id))
      .limit(1);
    await db.insert(products).values({
      name: "Sin receta",
      monthlyCapacity: 90,
      yieldQuantity: 1,
      businessId: business.id,
      isActive: true,
    });

    const result = await getCostDistributionService(user.id, {}, db);

    expect(result.status).toBe("unavailable");
    expect(result.rows[0]).toMatchObject({ absorbsExpenses: true, indirectUnit: "111.11", unitCost: null });
  });

  it("does not show another user's products or expenses", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const supply = await createSupplyService(owner.id, flour, db);
    await makeProduct(owner, supply.id, { name: "Pan", capacity: 100, grams: "100", yieldQuantity: "1" });
    await addExpenses(owner, "5000");

    const result = await getCostDistributionService(stranger.id, {}, db);

    expect(result).toMatchObject({ status: "no_capacity", totalExpenses: "0.00", rows: [] });
  });
});
