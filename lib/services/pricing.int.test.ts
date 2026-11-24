import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { businesses, products } from "@/lib/db/business/table";
import { supplies } from "@/lib/db/supplies/table";
import { eq } from "drizzle-orm";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { addPeriodCostLineService } from "./business-cost";
import { getCostDistributionService } from "./cost-distribution";
import {
  getPricingService,
  saveDefaultMarkupPercentService,
  saveProductMarkupPercentService,
} from "./pricing";
import { createProductService } from "./products";
import { createSupplyService, updateSupplyService } from "./supplies";

// Integration tests against the local Supabase stack. One db client per file;
// deleteUser cascades the business, products and period expenses.

const flour = {
  kind: "supply" as const,
  name: "Harina 000",
  purchasePrice: "18750.00",
  purchaseQuantity: "25",
  purchaseUnit: "kg",
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

async function makeProduct(user: CreatedUser, name: string, capacity: number) {
  const supply = await createSupplyService(user.id, flour, db);
  return createProductService(
    user.id,
    {
      name,
      monthlyCapacity: capacity,
      yieldQuantity: "12",
      recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
    },
    db,
  );
}

async function makePricedUser(unitCost: string, capacity = 120) {
  const user = await makeUser();
  await makeProduct(user, "Pan flauta", capacity);
  await addPeriodCostLineService(user.id, { concept: "Alquiler", amountPeriod: unitCost }, db);
  const distribution = await getCostDistributionService(user.id, {}, db);
  return { user, distribution };
}

describe("getPricingService", () => {
  it("derives the price from the effective markup and the total unit cost", async () => {
    const { user, distribution } = await makePricedUser("120000");
    const cost = distribution.rows[0].unitCost;
    // 250 g * (18.750 / 25 kg) / 12 = 15.63 + 1.000 of indirect per unit.
    expect(cost).toBe("1015.63");
    await saveDefaultMarkupPercentService(user.id, { defaultMarkupPercent: "30" }, db);

    const result = await getPricingService(user.id, {}, db);

    expect(result.defaultMarkupPercent).toBe("30.00");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      markupPercent: "30.00",
      markupSource: "business",
      unitCost: cost,
      price: "1320.32",
      profitUnit: "304.69",
      unavailableCode: null,
    });
  });

  it("uses the product markup only for that product and falls back to the default", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, flour, db);
    for (const name of ["Pan flauta", "Facturas"]) {
      await createProductService(
        user.id,
        {
          name,
          monthlyCapacity: 120,
          yieldQuantity: "12",
          recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
        },
        db,
      );
    }
    await addPeriodCostLineService(user.id, { concept: "Alquiler", amountPeriod: "120000" }, db);
    await saveDefaultMarkupPercentService(user.id, { defaultMarkupPercent: "30" }, db);
    const [pan] = await db.select().from(products).where(eq(products.name, "Pan flauta"));
    await saveProductMarkupPercentService(user.id, pan.id, { markupPercent: "45" }, db);

    const result = await getPricingService(user.id, {}, db);

    expect(result.rows.map((row) => [row.name, row.markupPercent, row.markupSource])).toEqual([
      ["Pan flauta", "45.00", "product"],
      ["Facturas", "30.00", "business"],
    ]);
  });

  it("reports a missing markup without a price", async () => {
    const { user } = await makePricedUser("120000");

    const result = await getPricingService(user.id, {}, db);

    expect(result.defaultMarkupPercent).toBeNull();
    expect(result.rows[0]).toMatchObject({
      markupPercent: null,
      markupSource: "none",
      price: null,
      unavailableCode: "NO_MARKUP",
    });
  });

  it("reports a missing unit cost without a price", async () => {
    const user = await makeUser();
    await makeProduct(user, "Pan flauta", 120);
    await saveDefaultMarkupPercentService(user.id, { defaultMarkupPercent: "30" }, db);

    const result = await getPricingService(user.id, {}, db);

    expect(result.rows[0]).toMatchObject({
      unitCost: null,
      price: null,
      unavailableCode: "NO_TOTAL_COST",
    });
  });

  it("recomputes the price when a period expense changes", async () => {
    const { user } = await makePricedUser("120000");
    await saveDefaultMarkupPercentService(user.id, { defaultMarkupPercent: "30" }, db);
    const before = await getPricingService(user.id, {}, db);

    await addPeriodCostLineService(user.id, { concept: "Luz", amountPeriod: "120000" }, db);
    const after = await getPricingService(user.id, {}, db);

    expect(after.rows[0].unitCost).not.toBe(before.rows[0].unitCost);
    expect(after.rows[0].price).not.toBe(before.rows[0].price);
  });

  it("recomputes the price when the supply price changes", async () => {
    const { user } = await makePricedUser("120000");
    await saveDefaultMarkupPercentService(user.id, { defaultMarkupPercent: "30" }, db);
    const before = await getPricingService(user.id, {}, db);
    const [supply] = await db.select().from(supplies).where(eq(supplies.name, flour.name));

    await updateSupplyService(user.id, supply.id, {
      ...flour,
      purchasePrice: "37500.00",
    }, db);
    const after = await getPricingService(user.id, {}, db);

    expect(after.rows[0].unitCost).not.toBe(before.rows[0].unitCost);
    expect(after.rows[0].price).not.toBe(before.rows[0].price);
  });
});

describe("markup write services", () => {
  it("clears the business default and the product override with null", async () => {
    const { user } = await makePricedUser("120000");
    const [product] = await db.select().from(products).limit(1);
    await saveDefaultMarkupPercentService(user.id, { defaultMarkupPercent: "30" }, db);
    await saveProductMarkupPercentService(user.id, product.id, { markupPercent: "45" }, db);

    expect(await saveDefaultMarkupPercentService(user.id, { defaultMarkupPercent: null }, db)).toBeNull();
    expect(await saveProductMarkupPercentService(user.id, product.id, { markupPercent: null }, db)).toBeNull();

    const stored = await db.select().from(products).where(eq(products.id, product.id));
    const [business] = await db.select().from(businesses).where(eq(businesses.ownerUserId, user.id));
    expect(stored[0].markupPercent).toBeNull();
    expect(business.defaultMarkupPercent).toBeNull();
  });

  it("rejects a non-positive markup", async () => {
    const { user } = await makePricedUser("120000");

    await expect(
      saveDefaultMarkupPercentService(user.id, { defaultMarkupPercent: "0" }, db),
    ).rejects.toThrow();
    await expect(
      saveProductMarkupPercentService(user.id, "00000000-0000-0000-0000-000000000000", { markupPercent: "30" }, db),
    ).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
  });

  it("does not modify an inactive product", async () => {
    const { user } = await makePricedUser("120000");
    const [product] = await db.select().from(products).limit(1);
    await db.update(products).set({ isActive: false }).where(eq(products.id, product.id));

    await expect(
      saveProductMarkupPercentService(user.id, product.id, { markupPercent: "30" }, db),
    ).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
  });

  it("keeps two users' markups isolated", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const productA = await makeProduct(a, "Pan de A", 120);

    await saveDefaultMarkupPercentService(a.id, { defaultMarkupPercent: "30" }, db);
    await saveProductMarkupPercentService(a.id, productA.id, { markupPercent: "45" }, db);

    expect(await saveDefaultMarkupPercentService(b.id, { defaultMarkupPercent: "10" }, db)).toBe("10.00");
    const pricingB = await getPricingService(b.id, {}, db);
    expect(pricingB.defaultMarkupPercent).toBe("10.00");

    await expect(
      saveProductMarkupPercentService(b.id, productA.id, { markupPercent: "99" }, db),
    ).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
  });
});
