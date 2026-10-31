import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { and, eq } from "drizzle-orm";

import { businesses, products } from "@/lib/db/business/table";
import { calculations, costingSetup } from "@/lib/db/calculation/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import {
  getCalculatorDraftSetupService,
  getCalculatorSetupService,
  getDraftCalculationId,
  saveCalculatorSetupService,
} from "./calculator";

// Integration tests against the local Supabase stack (.env.test URLs are
// local-only; loadTestEnv throws otherwise). One db client (one postgres-js
// pool) per file, closed in afterAll; users are removed (profile + auth user)
// after each test, cascading their business/product/calculation/costing_setup
// rows.

const validInput = {
  name: "Velas de cera",
  unit: "unidad",
  volume: 48,
  currency: "ARS",
  period: "Mensual",
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

// Snapshot of every row the setup flow owns. The read service must not change
// any of them; comparing full rows catches updates, not just inserts/deletes.
async function getSetupRows(userId: string) {
  const businessRows = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId));

  const productRows = await db
    .select()
    .from(products)
    .innerJoin(businesses, eq(products.businessId, businesses.id))
    .where(eq(businesses.ownerUserId, userId));

  const calculationRows = await db
    .select()
    .from(calculations)
    .where(eq(calculations.userId, userId));

  const setupRows = await db
    .select()
    .from(costingSetup)
    .innerJoin(calculations, eq(costingSetup.calculationId, calculations.id))
    .where(eq(calculations.userId, userId));

  return { businessRows, productRows, calculationRows, setupRows };
}

describe("saveCalculatorSetupService", () => {
  it("first save creates one business, one product, one draft and one costing_setup", async () => {
    const user = await makeUser();

    const result = await saveCalculatorSetupService(user.id, validInput, db);

    expect(result).toEqual(validInput);

    const businessRows = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, user.id));
    expect(businessRows).toHaveLength(1);

    const productRows = await db
      .select()
      .from(products)
      .where(eq(products.businessId, businessRows[0].id));
    expect(productRows).toHaveLength(1);
    expect(productRows[0].name).toBe(validInput.name);

    const calcRows = await db
      .select()
      .from(calculations)
      .where(and(eq(calculations.userId, user.id), eq(calculations.status, "draft")));
    expect(calcRows).toHaveLength(1);

    const csRows = await db
      .select()
      .from(costingSetup)
      .where(eq(costingSetup.calculationId, calcRows[0].id));
    expect(csRows).toHaveLength(1);
    expect(csRows[0]).toMatchObject({
      unit: validInput.unit,
      volume: validInput.volume,
      currency: validInput.currency,
      period: validInput.period,
    });
  });

  it("second save updates the same rows and stays idempotent", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(user.id, validInput, db);
    const draftId = await getDraftCalculationId(user.id, db);

    const updated = { ...validInput, name: "Velas XL", volume: 24 };
    const result = await saveCalculatorSetupService(user.id, updated, db);

    expect(result).toEqual(updated);
    expect(await getDraftCalculationId(user.id, db)).toBe(draftId);

    const businessRows = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, user.id));
    expect(businessRows).toHaveLength(1);

    const calcRows = await db
      .select()
      .from(calculations)
      .where(and(eq(calculations.userId, user.id), eq(calculations.status, "draft")));
    expect(calcRows).toHaveLength(1);

    const productRows = await db
      .select()
      .from(products)
      .where(eq(products.businessId, businessRows[0].id));
    expect(productRows).toHaveLength(1);
    expect(productRows[0].name).toBe("Velas XL");

    const csRows = await db
      .select()
      .from(costingSetup)
      .where(eq(costingSetup.calculationId, draftId!));
    expect(csRows).toHaveLength(1);
    expect(csRows[0].volume).toBe(24);
  });

  it.each([
    ["volume is zero", { volume: 0 }],
    ["volume is negative", { volume: -1 }],
    ["volume is fractional", { volume: 1.5 }],
    ["name is whitespace-only", { name: "  " }],
    ["currency is USD", { currency: "USD" }],
    ["period is Anual", { period: "Anual" }],
  ])("rejects input without persisting rows when %s", async (_scenario, invalidFields) => {
    const user = await makeUser();

    await expect(
      saveCalculatorSetupService(user.id, { ...validInput, ...invalidFields }, db),
    ).rejects.toBeInstanceOf(ZodError);

    expect(await getDraftCalculationId(user.id, db)).toBeNull();
    expect(await getCalculatorSetupService(user.id, db)).toBeNull();
    const businessRows = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, user.id));
    expect(businessRows).toHaveLength(0);

    const productRows = await db
      .select({ id: products.id })
      .from(products)
      .innerJoin(businesses, eq(products.businessId, businesses.id))
      .where(eq(businesses.ownerUserId, user.id));
    expect(productRows).toHaveLength(0);

    const calcRows = await db
      .select({ id: calculations.id })
      .from(calculations)
      .where(eq(calculations.userId, user.id));
    expect(calcRows).toHaveLength(0);

    const csRows = await db
      .select({ calculationId: costingSetup.calculationId })
      .from(costingSetup)
      .innerJoin(calculations, eq(costingSetup.calculationId, calculations.id))
      .where(eq(calculations.userId, user.id));
    expect(csRows).toHaveLength(0);
  });

  it("user B cannot read or overwrite user A's draft", async () => {
    const userA = await makeUser();
    const userB = await makeUser();

    await saveCalculatorSetupService(userA.id, validInput, db);
    const draftIdA = await getDraftCalculationId(userA.id, db);

    // B sees nothing of A's setup.
    expect(await getCalculatorSetupService(userB.id, db)).toBeNull();
    expect(await getDraftCalculationId(userB.id, db)).toBeNull();

    // B saving creates B's own rows and leaves A untouched.
    const bInput = { ...validInput, name: "B product" };
    await saveCalculatorSetupService(userB.id, bInput, db);

    expect(await getDraftCalculationId(userA.id, db)).toBe(draftIdA);
    expect(await getCalculatorSetupService(userA.id, db)).toEqual(validInput);
    expect(await getCalculatorSetupService(userB.id, db)).toEqual(bInput);

    const aBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, userA.id));
    expect(aBusinesses).toHaveLength(1);
  });
});

describe("getCalculatorSetupService", () => {
  it("returns exactly what was saved", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(user.id, validInput, db);

    expect(await getCalculatorSetupService(user.id, db)).toEqual(validInput);
  });

  it("returns null for a user with no draft", async () => {
    const user = await makeUser();
    expect(await getCalculatorSetupService(user.id, db)).toBeNull();
  });
});

describe("getCalculatorDraftSetupService", () => {
  it("returns no draft when the user has no calculations", async () => {
    const user = await makeUser();

    expect(await getCalculatorDraftSetupService(user.id, db)).toEqual({
      calculationId: null,
      setup: null,
    });
  });

  it("returns the draft id and the saved setup", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(user.id, validInput, db);
    const draftId = await getDraftCalculationId(user.id, db);

    expect(draftId).not.toBeNull();
    expect(await getCalculatorDraftSetupService(user.id, db)).toEqual({
      calculationId: draftId,
      setup: validInput,
    });
  });

  it("returns the edited setup on the same draft after save, edit and read", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(user.id, validInput, db);
    const draftId = await getDraftCalculationId(user.id, db);
    const updated = { ...validInput, name: "Velas XL", unit: "caja", volume: 24 };

    await saveCalculatorSetupService(user.id, updated, db);

    expect(await getCalculatorDraftSetupService(user.id, db)).toEqual({
      calculationId: draftId,
      setup: updated,
    });

    const calculationRows = await db
      .select({ id: calculations.id })
      .from(calculations)
      .where(eq(calculations.userId, user.id));
    expect(calculationRows).toHaveLength(1);
  });

  it("picks the latest draft deterministically when the user has two", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(user.id, validInput, db);
    const firstDraftId = await getDraftCalculationId(user.id, db);
    expect(firstDraftId).not.toBeNull();

    const [business] = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.ownerUserId, user.id));
    expect(business).toBeDefined();

    const [secondProduct] = await db
      .insert(products)
      .values({ businessId: business.id, name: "Producto nuevo" })
      .returning();
    const [secondDraft] = await db
      .insert(calculations)
      .values({
        userId: user.id,
        businessId: business.id,
        productId: secondProduct.id,
        createdAt: new Date(Date.now() + 60_000),
      })
      .returning();
    const secondSetup = {
      unit: "kg",
      volume: 10,
      currency: "ARS",
      period: "Mensual",
    } as const;
    await db.insert(costingSetup).values({
      calculationId: secondDraft.id,
      ...secondSetup,
    });

    const expected = {
      calculationId: secondDraft.id,
      setup: { name: "Producto nuevo", ...secondSetup },
    };

    // Two reads must agree: createdAt DESC is the tie-breaker.
    expect(await getCalculatorDraftSetupService(user.id, db)).toEqual(expected);
    expect(await getCalculatorDraftSetupService(user.id, db)).toEqual(expected);
  });

  it("returns the draft id but no setup when the setup row is missing", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(user.id, validInput, db);
    const draftId = await getDraftCalculationId(user.id, db);
    expect(draftId).not.toBeNull();

    await db.delete(costingSetup).where(eq(costingSetup.calculationId, draftId!));

    expect(await getCalculatorDraftSetupService(user.id, db)).toEqual({
      calculationId: draftId,
      setup: null,
    });
  });

  it("does not leak one user's draft into another user", async () => {
    const userA = await makeUser();
    const userB = await makeUser();

    await saveCalculatorSetupService(userA.id, validInput, db);
    const draftA = await getDraftCalculationId(userA.id, db);

    const bInput = { ...validInput, name: "B product", volume: 24 };
    await saveCalculatorSetupService(userB.id, bInput, db);
    const draftB = await getDraftCalculationId(userB.id, db);

    expect(await getCalculatorDraftSetupService(userA.id, db)).toEqual({
      calculationId: draftA,
      setup: validInput,
    });
    expect(await getCalculatorDraftSetupService(userB.id, db)).toEqual({
      calculationId: draftB,
      setup: bInput,
    });
  });

  it("does not write any row", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(user.id, validInput, db);
    const before = await getSetupRows(user.id);

    await getCalculatorDraftSetupService(user.id, db);

    expect(await getSetupRows(user.id)).toEqual(before);
  });
});
