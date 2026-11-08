import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ZodError } from "zod";
import { and, eq } from "drizzle-orm";

import { businesses, products } from "@/lib/db/business/table";
import {
  calculations,
  computedResults,
  costingSetup,
} from "@/lib/db/calculation/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { businessCostLines, calcCostLines } from "@/lib/db/costs/table";
import { AppError } from "@/lib/errors/app-error";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { createCalculationService, setActiveCalculationService } from "./calculations";
import {
  advanceCalculatorProgressService,
  getCalculatorCostSummaryService,
  getCalculatorDraftSetupService,
  getCalculatorProgressService,
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
const clients = new Map<string, SupabaseClient>();

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
  clients.clear();
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
  const env = loadTestEnv();
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw error;
  clients.set(user.id, client);
  return user;
}

function session(user: CreatedUser): SupabaseClient {
  const client = clients.get(user.id);
  if (!client) throw new Error("Missing test session");
  return client;
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

    const result = await saveCalculatorSetupService(session(user), validInput, db);

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
    await saveCalculatorSetupService(session(user), validInput, db);
    const draftId = await getDraftCalculationId(session(user), db);

    const updated = { ...validInput, name: "Velas XL", volume: 24 };
    const result = await saveCalculatorSetupService(session(user), updated, db);

    expect(result).toEqual(updated);
    expect(await getDraftCalculationId(session(user), db)).toBe(draftId);

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
      saveCalculatorSetupService(session(user), { ...validInput, ...invalidFields }, db),
    ).rejects.toBeInstanceOf(ZodError);

    expect(await getDraftCalculationId(session(user), db)).toBeNull();
    expect((await getCalculatorDraftSetupService(session(user), db)).setup).toBeNull();
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

    await saveCalculatorSetupService(session(userA), validInput, db);
    const draftIdA = await getDraftCalculationId(session(userA), db);

    // B sees nothing of A's setup.
    // B sees nothing of A's setup.
    expect((await getCalculatorDraftSetupService(session(userB), db)).setup).toBeNull();
    expect(await getDraftCalculationId(session(userB), db)).toBeNull();

    // B saving creates B's own rows and leaves A untouched.
    const bInput = { ...validInput, name: "B product" };
    await saveCalculatorSetupService(session(userB), { ...bInput, userId: userA.id }, db);
    const updatedB = { ...bInput, volume: 12 };
    await saveCalculatorSetupService(session(userB), { ...updatedB, userId: userA.id }, db);

    expect(await getDraftCalculationId(session(userA), db)).toBe(draftIdA);
    expect((await getCalculatorDraftSetupService(session(userA), db)).setup).toEqual(validInput);
    expect((await getCalculatorDraftSetupService(session(userB), db)).setup).toEqual(updatedB);

    const aBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, userA.id));
    expect(aBusinesses).toHaveLength(1);
  });
});

describe("session authentication", () => {
  it("rejects all protected operations when a real session is signed out", async () => {
    const user = await makeUser();
    const client = session(user);
    await saveCalculatorSetupService(client, validInput, db);
    const { error } = await client.auth.signOut();
    if (error) throw error;

    await expect(getDraftCalculationId(client, db)).rejects.toEqual(new AppError("UNAUTHORIZED"));
    await expect(getCalculatorDraftSetupService(client, db)).rejects.toEqual(new AppError("UNAUTHORIZED"));
    await expect(
      saveCalculatorSetupService(client, { ...validInput, name: "Denied" }, db),
    ).rejects.toEqual(new AppError("UNAUTHORIZED"));

    const { error: loginError } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });
    if (loginError) throw loginError;
    expect((await getCalculatorDraftSetupService(client, db)).setup).toEqual(validInput);
  });

  it("uses the current session when the client switches users", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const client = session(userA);
    await saveCalculatorSetupService(client, validInput, db);

    const { error } = await client.auth.signInWithPassword({ email: userB.email, password: userB.password });
    if (error) throw error;

    expect((await getCalculatorDraftSetupService(client, db)).setup).toBeNull();
    await saveCalculatorSetupService(client, { ...validInput, name: "B current session" }, db);
    expect((await getCalculatorDraftSetupService(session(userB), db)).setup).toEqual({
      ...validInput,
      name: "B current session",
    });
    const { error: restoreError } = await client.auth.signInWithPassword({
      email: userA.email,
      password: userA.password,
    });
    if (restoreError) throw restoreError;
    expect((await getCalculatorDraftSetupService(client, db)).setup).toEqual(validInput);
  });
});

describe("getCalculatorDraftSetupService", () => {
  it("returns no draft when the user has no calculations", async () => {
    const user = await makeUser();

    expect(await getCalculatorDraftSetupService(session(user), db)).toEqual({
      calculationId: null,
      setup: null,
    });
  });

  it("returns the draft id and the saved setup", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(session(user), validInput, db);
    const draftId = await getDraftCalculationId(session(user), db);

    expect(draftId).not.toBeNull();
    expect(await getCalculatorDraftSetupService(session(user), db)).toEqual({
      calculationId: draftId,
      setup: validInput,
    });
  });

  it("returns the edited setup on the same draft after save, edit and read", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(session(user), validInput, db);
    const draftId = await getDraftCalculationId(session(user), db);
    const updated = { ...validInput, name: "Velas XL", unit: "caja", volume: 24 };

    await saveCalculatorSetupService(session(user), updated, db);

    expect(await getCalculatorDraftSetupService(session(user), db)).toEqual({
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
    await saveCalculatorSetupService(session(user), validInput, db);
    const firstDraftId = await getDraftCalculationId(session(user), db);
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
    expect(await getCalculatorDraftSetupService(session(user), db)).toEqual(expected);
    expect(await getCalculatorDraftSetupService(session(user), db)).toEqual(expected);
  });

  it("returns the draft id but no setup when the setup row is missing", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(session(user), validInput, db);
    const draftId = await getDraftCalculationId(session(user), db);
    expect(draftId).not.toBeNull();

    await db.delete(costingSetup).where(eq(costingSetup.calculationId, draftId!));

    expect(await getCalculatorDraftSetupService(session(user), db)).toEqual({
      calculationId: draftId,
      setup: null,
    });
  });

  it("does not leak one user's draft into another user", async () => {
    const userA = await makeUser();
    const userB = await makeUser();

    await saveCalculatorSetupService(session(userA), validInput, db);
    const draftA = await getDraftCalculationId(session(userA), db);

    const bInput = { ...validInput, name: "B product", volume: 24 };
    await saveCalculatorSetupService(session(userB), bInput, db);
    const draftB = await getDraftCalculationId(session(userB), db);

    expect(await getCalculatorDraftSetupService(session(userA), db)).toEqual({
      calculationId: draftA,
      setup: validInput,
    });
    expect(await getCalculatorDraftSetupService(session(userB), db)).toEqual({
      calculationId: draftB,
      setup: bInput,
    });
  });

  it("does not write any row", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(session(user), validInput, db);
    const before = await getSetupRows(user.id);

    await getCalculatorDraftSetupService(session(user), db);

    expect(await getSetupRows(user.id)).toEqual(before);
  });
});

type DraftFixture = {
  user: CreatedUser;
  calculationId: string;
  businessId: string;
};

// Creates a draft through the setup service, then resolves the business the
// cost lines hang from. A business_cost_lines row is required until #91 makes
// calc_cost_lines.source_business_cost_id optional.
async function arrangeDraftWithSetup(volume: number): Promise<DraftFixture> {
  const user = await makeUser();
  await saveCalculatorSetupService(session(user), { ...validInput, volume }, db);

  const calculationId = await getDraftCalculationId(session(user), db);
  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.ownerUserId, user.id));

  if (!calculationId || !business) {
    throw new Error("[int] draft fixture was not created");
  }

  return { user, calculationId, businessId: business.id };
}

type CostLineValues = {
  concept: string;
  behavior: string;
  traceability: string;
  amount: string;
  // Omitted: the column default, 1.
  yieldQuantity?: string;
};

async function insertCostLine(
  fixture: DraftFixture,
  values: CostLineValues,
): Promise<void> {
  const [source] = await db
    .insert(businessCostLines)
    .values({
      businessId: fixture.businessId,
      concept: values.concept,
      behavior: values.behavior,
      traceability: values.traceability,
      amountPeriod: values.amount,
    })
    .returning({ id: businessCostLines.id });

  await db.insert(calcCostLines).values({
    calculationId: fixture.calculationId,
    sourceBusinessCostId: source.id,
    concept: values.concept,
    behavior: values.behavior,
    traceability: values.traceability,
    amount: values.amount,
    yieldQuantity: values.yieldQuantity,
  });
}

describe("getCalculatorCostSummaryService", () => {
  it("returns no values when the user has no draft", async () => {
    const user = await makeUser();

    expect(await getCalculatorCostSummaryService(user.id, db)).toEqual({
      calculationId: null,
      totalFixed: null,
      variableUnit: null,
      unitCost: null,
      volume: null,
      currency: "ARS",
    });
  });

  it("returns only the draft id when the draft has no costing_setup", async () => {
    const fixture = await arrangeDraftWithSetup(12);
    await db
      .delete(costingSetup)
      .where(eq(costingSetup.calculationId, fixture.calculationId));

    expect(await getCalculatorCostSummaryService(fixture.user.id, db)).toEqual({
      calculationId: fixture.calculationId,
      totalFixed: null,
      variableUnit: null,
      unitCost: null,
      volume: null,
      currency: "ARS",
    });
  });

  it("returns the draft and its volume but no amounts when there are no cost lines", async () => {
    const fixture = await arrangeDraftWithSetup(24);

    expect(await getCalculatorCostSummaryService(fixture.user.id, db)).toEqual({
      calculationId: fixture.calculationId,
      totalFixed: null,
      variableUnit: null,
      unitCost: null,
      volume: 24,
      currency: "ARS",
    });
  });

  it("returns the engine totals as decimal strings when there are fixed and variable costs", async () => {
    const fixture = await arrangeDraftWithSetup(12);
    await insertCostLine(fixture, {
      concept: "Alquiler",
      behavior: "fixed",
      traceability: "indirect",
      amount: "1000.00",
    });
    await insertCostLine(fixture, {
      concept: "Harina",
      behavior: "variable",
      traceability: "direct",
      amount: "2400.00",
      yieldQuantity: "12",
    });

    const summary = await getCalculatorCostSummaryService(fixture.user.id, db);

    // totalFixed = subtotalFijo (1000.00); variableUnit = 2400 / yield 12 =
    // 200.00; unitCost = 1000 / 12 + 200 = 283.333... -> 283.33.
    expect(summary).toEqual({
      calculationId: fixture.calculationId,
      totalFixed: "1000.00",
      variableUnit: "200.00",
      unitCost: "283.33",
      volume: 12,
      currency: "ARS",
    });
    expect(typeof summary.totalFixed).toBe("string");
    expect(typeof summary.variableUnit).toBe("string");
    expect(typeof summary.unitCost).toBe("string");
  });

  it("returns 0.00 for the variable category when only fixed lines exist", async () => {
    const fixture = await arrangeDraftWithSetup(12);
    await insertCostLine(fixture, {
      concept: "Alquiler",
      behavior: "fixed",
      traceability: "indirect",
      amount: "1200.00",
    });

    expect(await getCalculatorCostSummaryService(fixture.user.id, db)).toEqual({
      calculationId: fixture.calculationId,
      totalFixed: "1200.00",
      variableUnit: "0.00",
      unitCost: "100.00",
      volume: 12,
      currency: "ARS",
    });
  });

  it("returns 0.00 for the fixed category when only variable lines exist", async () => {
    const fixture = await arrangeDraftWithSetup(12);
    await insertCostLine(fixture, {
      concept: "Harina",
      behavior: "variable",
      traceability: "direct",
      amount: "1200.00",
      yieldQuantity: "12",
    });

    expect(await getCalculatorCostSummaryService(fixture.user.id, db)).toEqual({
      calculationId: fixture.calculationId,
      totalFixed: "0.00",
      variableUnit: "100.00",
      unitCost: "100.00",
      volume: 12,
      currency: "ARS",
    });
  });

  it("accepts the persisted fixed/direct vocabulary as stored", async () => {
    const fixture = await arrangeDraftWithSetup(10);
    await insertCostLine(fixture, {
      concept: "Alquiler",
      behavior: "fixed",
      traceability: "direct",
      amount: "50.00",
    });
    await insertCostLine(fixture, {
      concept: "Harina",
      behavior: "variable",
      traceability: "direct",
      amount: "30.00",
      yieldQuantity: "10",
    });

    // The base stores "fixed"/"direct" and the engine accepts that vocabulary
    // as-is (2f28426), so the rows reach it with no translation.
    expect(await getCalculatorCostSummaryService(fixture.user.id, db)).toEqual({
      calculationId: fixture.calculationId,
      totalFixed: "50.00",
      variableUnit: "3.00",
      unitCost: "8.00",
      volume: 10,
      currency: "ARS",
    });
  });

  it("divides each variable purchase by its yield, whatever the volume", async () => {
    const fixture = await arrangeDraftWithSetup(100);
    await insertCostLine(fixture, {
      concept: "Alquiler",
      behavior: "fixed",
      traceability: "direct",
      amount: "10000.00",
    });
    await insertCostLine(fixture, {
      concept: "Rollo de envases",
      behavior: "variable",
      traceability: "direct",
      amount: "30000.00",
      yieldQuantity: "20",
    });
    await insertCostLine(fixture, {
      concept: "Etiqueta",
      behavior: "variable",
      traceability: "direct",
      amount: "5.00",
    });

    // variableUnit = 30000 / 20 + 5 / 1 = 1505.00; unitCost = 10000 / 100 + 1505.
    expect(await getCalculatorCostSummaryService(fixture.user.id, db)).toEqual({
      calculationId: fixture.calculationId,
      totalFixed: "10000.00",
      variableUnit: "1505.00",
      unitCost: "1605.00",
      volume: 100,
      currency: "ARS",
    });
  });

  it("does not write computed_results or calc_cost_lines", async () => {
    const fixture = await arrangeDraftWithSetup(12);
    await insertCostLine(fixture, {
      concept: "Harina",
      behavior: "variable",
      traceability: "direct",
      amount: "240.00",
    });

    const resultsBefore = await db
      .select()
      .from(computedResults)
      .where(eq(computedResults.calculationId, fixture.calculationId));
    const linesBefore = await db
      .select()
      .from(calcCostLines)
      .where(eq(calcCostLines.calculationId, fixture.calculationId));

    await getCalculatorCostSummaryService(fixture.user.id, db);

    expect(
      await db
        .select()
        .from(computedResults)
        .where(eq(computedResults.calculationId, fixture.calculationId)),
    ).toEqual(resultsBefore);
    expect(
      await db
        .select()
        .from(calcCostLines)
        .where(eq(calcCostLines.calculationId, fixture.calculationId)),
    ).toEqual(linesBefore);
  });

  it("does not leak one user's costs into another user's summary", async () => {
    const fixtureA = await arrangeDraftWithSetup(12);
    await insertCostLine(fixtureA, {
      concept: "Harina de A",
      behavior: "variable",
      traceability: "direct",
      amount: "1200.00",
      yieldQuantity: "12",
    });

    const fixtureB = await arrangeDraftWithSetup(24);
    await insertCostLine(fixtureB, {
      concept: "Harina de B",
      behavior: "variable",
      traceability: "direct",
      amount: "4800.00",
      yieldQuantity: "24",
    });

    expect(await getCalculatorCostSummaryService(fixtureA.user.id, db)).toEqual({
      calculationId: fixtureA.calculationId,
      totalFixed: "0.00",
      variableUnit: "100.00",
      unitCost: "100.00",
      volume: 12,
      currency: "ARS",
    });
    expect(await getCalculatorCostSummaryService(fixtureB.user.id, db)).toEqual({
      calculationId: fixtureB.calculationId,
      totalFixed: "0.00",
      variableUnit: "200.00",
      unitCost: "200.00",
      volume: 24,
      currency: "ARS",
    });
  });

  it("throws CALC_COST_SUMMARY_FAILED when the engine rejects a persisted line", async () => {
    const fixture = await arrangeDraftWithSetup(12);
    await insertCostLine(fixture, {
      concept: "Harina",
      behavior: "banana",
      traceability: "direct",
      amount: "1200.00",
    });

    await expect(
      getCalculatorCostSummaryService(fixture.user.id, db),
    ).rejects.toMatchObject({ code: "CALC_COST_SUMMARY_FAILED" });
  });
});

describe("calc_cost_lines.is_own_labor", () => {
  const ownLaborLine = (fixture: DraftFixture, amount = "200000.00") => ({
    calculationId: fixture.calculationId,
    concept: "Trabajo propio",
    behavior: "fixed",
    traceability: "indirect",
    amount,
    isOwnLabor: true,
  });

  it("defaults to false for a line inserted without the flag", async () => {
    const fixture = await arrangeDraftWithSetup(12);
    await insertCostLine(fixture, {
      concept: "Alquiler",
      behavior: "fixed",
      traceability: "direct",
      amount: "1000.00",
    });

    const rows = await db
      .select({ isOwnLabor: calcCostLines.isOwnLabor })
      .from(calcCostLines)
      .where(eq(calcCostLines.calculationId, fixture.calculationId));

    expect(rows).toEqual([{ isOwnLabor: false }]);
  });

  it("counts an own-labor line in the totals like any other fixed line", async () => {
    const fixture = await arrangeDraftWithSetup(10);
    await insertCostLine(fixture, {
      concept: "Alquiler",
      behavior: "fixed",
      traceability: "direct",
      amount: "1000.00",
    });
    await db.insert(calcCostLines).values(ownLaborLine(fixture, "2000.00"));

    const summary = await getCalculatorCostSummaryService(fixture.user.id, db);

    expect(summary.totalFixed).toBe("3000.00");
    expect(summary.unitCost).toBe("300.00");
  });

  it("allows one own-labor line per draft and rejects a second one", async () => {
    const fixture = await arrangeDraftWithSetup(10);
    await db.insert(calcCostLines).values(ownLaborLine(fixture));

    await expect(db.insert(calcCostLines).values(ownLaborLine(fixture))).rejects.toThrow();
  });

  it("does not limit the lines that are not own labor", async () => {
    const fixture = await arrangeDraftWithSetup(10);
    await db.insert(calcCostLines).values(ownLaborLine(fixture));

    for (const concept of ["Publicidad", "Contador"]) {
      await db.insert(calcCostLines).values({
        calculationId: fixture.calculationId,
        concept,
        behavior: "fixed",
        traceability: "indirect",
        amount: "100.00",
      });
    }

    const rows = await db
      .select({ id: calcCostLines.id })
      .from(calcCostLines)
      .where(eq(calcCostLines.calculationId, fixture.calculationId));

    expect(rows).toHaveLength(3);
  });
});

describe("wizard progress (calculations.current_step)", () => {
  it("a user without a draft only has step 1", async () => {
    const user = await makeUser();

    expect(await getCalculatorProgressService(user.id, db)).toEqual({ currentStep: 1 });
  });

  it("the first save unlocks step 2", async () => {
    const user = await makeUser();

    await saveCalculatorSetupService(session(user), validInput, db);

    expect(await getCalculatorProgressService(user.id, db)).toEqual({ currentStep: 2 });
  });

  it("saving step 1 again never lowers a more advanced step", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(session(user), validInput, db);
    await db.update(calculations).set({ currentStep: 4 }).where(eq(calculations.userId, user.id));

    await saveCalculatorSetupService(session(user), { ...validInput, volume: 60 }, db);

    expect(await getCalculatorProgressService(user.id, db)).toEqual({ currentStep: 4 });
  });

  it("editing the active calculation X leaves a newer draft Z untouched", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(session(user), validInput, db);
    const xId = await getDraftCalculationId(session(user), db);
    await db.update(calculations).set({ currentStep: 5 }).where(eq(calculations.id, xId!));
    const { calculationId: zId } = await createCalculationService(user.id, db);
    await setActiveCalculationService(user.id, xId!, db);

    await saveCalculatorSetupService(session(user), { ...validInput, name: "Editado" }, db);

    expect(await getDraftCalculationId(session(user), db)).toBe(xId);
    expect(await getCalculatorDraftSetupService(session(user), db)).toMatchObject({
      calculationId: xId,
      setup: { name: "Editado" },
    });
    expect(await getCalculatorProgressService(user.id, db)).toEqual({ currentStep: 5 });
    const [z] = await db.select().from(calculations).where(eq(calculations.id, zId));
    expect(z.currentStep).toBe(1);
    const zSetup = await db.select().from(costingSetup).where(eq(costingSetup.calculationId, zId));
    expect(zSetup).toHaveLength(0);
  });

  it("progress is private to each user", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await saveCalculatorSetupService(session(userA), validInput, db);

    expect(await getCalculatorProgressService(userB.id, db)).toEqual({ currentStep: 1 });
  });

  it("the read does not write any row", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(session(user), validInput, db);
    const before = await getSetupRows(user.id);

    await getCalculatorProgressService(user.id, db);

    expect(await getSetupRows(user.id)).toEqual(before);
  });
});

describe("advanceCalculatorProgressService", () => {
  it("advances from step 2 to step 3", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(session(user), validInput, db);

    const result = await advanceCalculatorProgressService(user.id, 3, db);

    expect(result).toEqual({ currentStep: 3 });
    expect(await getCalculatorProgressService(user.id, db)).toEqual({ currentStep: 3 });
  });

  it("never lowers the step when an earlier one is requested", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(session(user), validInput, db);
    await advanceCalculatorProgressService(user.id, 3, db);

    const result = await advanceCalculatorProgressService(user.id, 2, db);

    expect(result).toEqual({ currentStep: 3 });
    expect(await getCalculatorProgressService(user.id, db)).toEqual({ currentStep: 3 });
  });

  it("caps the step at 8", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(session(user), validInput, db);
    await db.update(calculations).set({ currentStep: 8 }).where(eq(calculations.userId, user.id));

    const result = await advanceCalculatorProgressService(user.id, 8, db);

    expect(result).toEqual({ currentStep: 8 });
  });

  it.each([
    ["below the range", 1],
    ["above the range", 9],
    ["not an integer", 2.5],
  ])("rejects a step that is %s without changing the progress", async (_name, step) => {
    const user = await makeUser();
    await saveCalculatorSetupService(session(user), validInput, db);

    await expect(advanceCalculatorProgressService(user.id, step, db)).rejects.toBeInstanceOf(
      ZodError,
    );

    expect(await getCalculatorProgressService(user.id, db)).toEqual({ currentStep: 2 });
  });

  it("throws CALC_DRAFT_MISSING when the user has no draft", async () => {
    const user = await makeUser();

    await expect(advanceCalculatorProgressService(user.id, 3, db)).rejects.toEqual(
      new AppError("CALC_DRAFT_MISSING"),
    );
  });

  it("leaves another user's draft untouched", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await saveCalculatorSetupService(session(userA), validInput, db);
    await saveCalculatorSetupService(session(userB), validInput, db);

    await advanceCalculatorProgressService(userA.id, 4, db);

    expect(await getCalculatorProgressService(userA.id, db)).toEqual({ currentStep: 4 });
    expect(await getCalculatorProgressService(userB.id, db)).toEqual({ currentStep: 2 });
  });
});
