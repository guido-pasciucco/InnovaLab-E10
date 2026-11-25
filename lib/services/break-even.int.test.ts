import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { getDrizzleClient, type Db } from "@/lib/db/client";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import type { VerifiedUserId } from "./auth";
import { getBreakEvenService } from "./break-even";
import { addPeriodCostLineService } from "./business-cost";
import { getPricingService, saveDefaultMarkupPercentService } from "./pricing";
import { createProductService } from "./products";
import { createSupplyService } from "./supplies";

// Integration tests of the break-even service with the real pricing service
// (#246) against the local Supabase stack. deleteUser cascades the business,
// products and period expenses.

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

function breakEvenOf(userId: VerifiedUserId) {
  return getBreakEvenService(userId, {
    getPricing: (id) => getPricingService(id, {}, db),
  });
}

async function makeReadyUser() {
  const user = await makeUser();
  await makeProduct(user, "Pan flauta", 120);
  await makeProduct(user, "Facturas", 60);
  await addPeriodCostLineService(user.id, { concept: "Alquiler", amountPeriod: "120000" }, db);
  await saveDefaultMarkupPercentService(user.id, { defaultMarkupPercent: "30" }, db);
  return user;
}

describe("getBreakEvenService with the real pricing service", () => {
  it("computes the break-even from the live catalog and closes on the expenses", async () => {
    const user = await makeReadyUser();
    const pricing = await getPricingService(user.id, {}, db);

    const result = await breakEvenOf(user.id);

    expect(result.status).toBe("ready");
    expect(result.excluded).toEqual([]);
    expect(result.rows.map((row) => [row.name, row.price])).toEqual(
      pricing.rows.map((row) => [row.name, row.price]),
    );
    expect(result.rows.map((row) => row.mixPct)).toEqual(["66.6667", "33.3333"]);
    expect(result.totals).toMatchObject({
      periodFixedCosts: "120000.00",
      closingContribution: "120000.00",
    });
  });

  it("asks for prices while no markup is loaded", async () => {
    const user = await makeUser();
    await makeProduct(user, "Pan flauta", 120);
    await addPeriodCostLineService(user.id, { concept: "Alquiler", amountPeriod: "120000" }, db);

    expect(await breakEvenOf(user.id)).toMatchObject({ status: "no_prices", rows: [], totals: null });
  });

  it("recomputes on the next read when the markup changes, without storing anything", async () => {
    const user = await makeReadyUser();
    const before = await breakEvenOf(user.id);

    await saveDefaultMarkupPercentService(user.id, { defaultMarkupPercent: "60" }, db);
    const after = await breakEvenOf(user.id);

    expect(Number(after.totals?.breakEvenUnits)).toBeLessThan(Number(before.totals?.breakEvenUnits));
    expect(after.totals?.closingContribution).toBe("120000.00");
  });

  it("does not show one user's catalog to another", async () => {
    const owner = await makeReadyUser();
    const other = await makeUser();

    expect((await breakEvenOf(owner.id)).rows).toHaveLength(2);
    expect(await breakEvenOf(other.id)).toMatchObject({ status: "no_products", rows: [], excluded: [] });
  });
});
