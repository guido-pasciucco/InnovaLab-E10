import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { getDrizzleClient, type Db } from "@/lib/db/client";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { addPeriodCostLineService } from "./business-cost";
import {
  closeCalculationService,
  getCalculationClosureService,
  getLatestClosureService,
  listCalculationClosuresService,
} from "./calculation-closures";
import { getPricingService, saveDefaultMarkupPercentService } from "./pricing";
import { createProductService, deleteProductService } from "./products";
import { createSupplyService, updateSupplyService } from "./supplies";

// Integration tests against the local Supabase stack (#322, steps 1-5 of the
// issue example). One pool per file; deleting the user cascades its closures.

const PERIOD = "2026-11";
const NOVEMBER = new Date("2026-11-24T21:40:00.000Z"); // 18:40 in Buenos Aires
const DECEMBER = new Date("2026-12-01T21:40:00.000Z");

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
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((failure) => failure.reason),
      `cleanup failed for ${failures.length} user(s)`,
    );
  }
});

async function makeUser(): Promise<CreatedUser> {
  const user = await createUser();
  users.push(user);
  return user;
}

async function makeCatalog(user: CreatedUser) {
  const supply = await createSupplyService(
    user.id,
    {
      kind: "supply",
      name: "Harina",
      purchasePrice: "1000.00",
      purchaseQuantity: "1",
      purchaseUnit: "kg",
    },
    db,
  );
  const product = await createProductService(
    user.id,
    {
      name: "Alfajor",
      monthlyCapacity: 150,
      yieldQuantity: "10",
      recipe: [{ supplyId: supply.id, quantity: "1", unit: "kg" }],
    },
    db,
  );
  await addPeriodCostLineService(
    user.id,
    { period: PERIOD, concept: "Alquiler", amountPeriod: "30000.00" },
    db,
  );
  await saveDefaultMarkupPercentService(user.id, { defaultMarkupPercent: "50" }, db);
  return { supply, product };
}

describe("monthly calculation closures", () => {
  it("saves the complete inputs and results of the first closing", async () => {
    const user = await makeUser();
    await makeCatalog(user);

    const closure = await closeCalculationService(user.id, { now: NOVEMBER }, db);

    expect(closure).toMatchObject({ period: PERIOD, version: 1, snapshotSchemaVersion: 1 });
    expect(closure.snapshot.inputs.supplies).toEqual([
      expect.objectContaining({ name: "Harina", price: "1000.00", unit: "kg" }),
    ]);
    expect(closure.snapshot.inputs.products).toEqual([
      expect.objectContaining({ name: "Alfajor", monthlyCapacity: 150, yieldQuantity: "10" }),
    ]);
    expect(closure.snapshot.inputs.defaultMarkupPercent).toBe("50.00");
    expect(closure.snapshot.results.costDistribution.rows[0]).toMatchObject({
      variableUnit: "100.00",
      indirectUnit: "200.00",
      unitCost: "300.00",
    });
    expect(closure.snapshot.results.pricing.rows[0]?.price).toBe("450.00");
    expect(closure.snapshot.results.breakEven.totals?.breakEvenSales).toBe("38571.43");
    expect(closure.snapshot.results.breakEven.totals?.breakEvenUnitsWhole).toBe("86");
  });

  it("keeps the old photo when the catalog changes and audits a new version", async () => {
    const user = await makeUser();
    const { supply } = await makeCatalog(user);
    const first = await closeCalculationService(user.id, { now: NOVEMBER }, db);

    await updateSupplyService(
      user.id,
      supply.id,
      {
        kind: "supply",
        name: "Harina",
        purchasePrice: "2000.00",
        purchaseQuantity: "1",
        purchaseUnit: "kg",
      },
      db,
    );

    expect((await getPricingService(user.id, { period: PERIOD }, db)).rows[0]?.price).toBe("600.00");

    const frozen = await getCalculationClosureService(user.id, PERIOD, {}, db);
    expect(frozen.closure.id).toBe(first.id);
    expect(frozen.closure.snapshot.results.pricing.rows[0]?.price).toBe("450.00");

    const second = await closeCalculationService(user.id, { now: NOVEMBER }, db);
    expect(second.version).toBe(2);
    expect(second.snapshot.results.pricing.rows[0]?.price).toBe("600.00");
    expect(second.snapshot.results.breakEven.totals?.breakEvenSales).toBe("45000.00");
    expect(second.snapshot.results.breakEven.totals?.breakEvenUnitsWhole).toBe("75");

    const detail = await getCalculationClosureService(user.id, PERIOD, {}, db);
    expect(detail.versions.map((item) => item.version)).toEqual([1, 2]);
    expect(detail.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Harina · precio", before: "1000.00", after: "2000.00" }),
        expect.objectContaining({ label: "Alfajor · costo variable", before: "100.00", after: "200.00" }),
        expect.objectContaining({ label: "Alfajor · precio", before: "450.00", after: "600.00" }),
        expect.objectContaining({
          label: "Ventas de equilibrio",
          before: "38571.43",
          after: "45000.00",
        }),
      ]),
    );
    expect(detail.changes.every((change) => change.changedAt === NOVEMBER.toISOString())).toBe(true);

    const firstVersion = await getCalculationClosureService(user.id, PERIOD, { version: 1 }, db);
    expect(firstVersion.closure.id).toBe(first.id);
    expect(firstVersion.changes).toEqual([]);
  });

  it("keeps both photos after deleting the product from the live catalog", async () => {
    const user = await makeUser();
    const { product } = await makeCatalog(user);
    await closeCalculationService(user.id, { now: NOVEMBER }, db);

    expect(await deleteProductService(user.id, product.id, db)).toBe(true);

    const history = await getCalculationClosureService(user.id, PERIOD, {}, db);
    expect(history.closure.snapshot.inputs.products[0]?.name).toBe("Alfajor");
    expect(history.closure.snapshot.results.pricing.rows[0]?.price).toBe("450.00");
  });

  it("lists closed months newest first with figures taken from the photo", async () => {
    const user = await makeUser();
    await makeCatalog(user);
    await closeCalculationService(user.id, { now: NOVEMBER }, db);
    await closeCalculationService(user.id, { now: NOVEMBER }, db);

    const months = await listCalculationClosuresService(user.id, db);
    expect(months).toHaveLength(1);
    expect(months[0]).toMatchObject({
      period: PERIOD,
      versionCount: 2,
      totalExpenses: "30000.00",
      breakEvenSales: "38571.43",
    });

    expect(await getLatestClosureService(user.id, { now: NOVEMBER }, db)).toEqual({
      version: 2,
      closedAt: NOVEMBER.toISOString(),
    });
    expect(await getLatestClosureService(user.id, { now: DECEMBER }, db)).toBeNull();
  });

  it("refuses to close a month that is not the current one", async () => {
    const user = await makeUser();
    await makeCatalog(user);

    await expect(
      closeCalculationService(user.id, { period: PERIOD, now: DECEMBER }, db),
    ).rejects.toMatchObject({ code: "CALC_CLOSURE_PERIOD_CLOSED" });
  });

  it("never shows another user's closures", async () => {
    const owner = await makeUser();
    await makeCatalog(owner);
    await closeCalculationService(owner.id, { now: NOVEMBER }, db);

    const other = await makeUser();
    expect(await listCalculationClosuresService(other.id, db)).toEqual([]);
    expect(await getLatestClosureService(other.id, { now: NOVEMBER }, db)).toBeNull();
    await expect(
      getCalculationClosureService(other.id, PERIOD, {}, db),
    ).rejects.toMatchObject({ code: "CALC_CLOSURE_NOT_FOUND" });
  });
});
