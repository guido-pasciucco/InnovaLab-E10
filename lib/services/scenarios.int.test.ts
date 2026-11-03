import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { asc, eq } from "drizzle-orm";

import { scenarios } from "@/lib/db/calculation/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { getDraftCalculationId, saveCalculatorSetupService } from "./calculator";
import { addCalcCostLineService, addVariableCalcCostLineService } from "./cost";
import { saveExpectedMarginService } from "./pricing";
import {
  deleteScenarioService,
  duplicateScenarioService,
  getScenarioComparisonService,
  updateScenarioService,
} from "./scenarios";

// Integration tests against the local Supabase stack (.env.test URLs are
// local-only; loadTestEnv throws otherwise). One db client per file, closed in
// afterAll; users are removed after each test, cascading their draft and its
// scenarios.
//
// Mockup example shared with steps 5 and 6: fixed 320.000, variable 2.500 per
// unit, 200 units and a 30 % margin.

const validSetup = {
  name: "Velas de cera",
  unit: "unidad",
  volume: 200,
  currency: "ARS",
  period: "Mensual",
} as const;

const MISSING_ID = "00000000-0000-4000-8000-000000000000";

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

async function makeUserWithDraft(): Promise<{ user: CreatedUser; calculationId: string }> {
  const user = await makeUser();
  await saveCalculatorSetupService(user.id, validSetup, db);
  const calculationId = await getDraftCalculationId(user.id, db);
  if (calculationId === null) throw new Error("draft was not created");
  return { user, calculationId };
}

// A draft with the mockup costs and margin, ready to compare.
async function makeUserWithPricedDraft(): Promise<{ user: CreatedUser; calculationId: string }> {
  const draft = await makeUserWithDraft();
  await addCalcCostLineService(draft.user.id, { concept: "Alquiler", amount: "320000" }, db);
  await addVariableCalcCostLineService(draft.user.id, { concept: "Envase", amount: "2500" }, db);
  await saveExpectedMarginService(draft.user.id, { expectedMarginPct: "30" }, db);
  return draft;
}

async function getScenarioRows(calculationId: string) {
  return db
    .select()
    .from(scenarios)
    .where(eq(scenarios.calculationId, calculationId))
    .orderBy(asc(scenarios.createdAt));
}

async function baseIdOf(userId: string): Promise<string> {
  const view = await getScenarioComparisonService(userId, db);
  return view.scenarios[0].id;
}

async function addAlternative(userId: string): Promise<string> {
  const created = await duplicateScenarioService(userId, await baseIdOf(userId), db);
  return created.id;
}

describe("getScenarioComparisonService", () => {
  it("returns no draft and no scenarios when the user has no draft", async () => {
    const user = await makeUser();

    const result = await getScenarioComparisonService(user.id, db);

    expect(result).toEqual({ calculationId: null, scenarios: [], inputs: null, comparison: null });
  });

  it("creates the base scenario on the first visit", async () => {
    const { user, calculationId } = await makeUserWithPricedDraft();

    const result = await getScenarioComparisonService(user.id, db);

    expect(result.scenarios).toEqual([
      { id: expect.any(String), name: "Base", isBase: true, priceOverride: null, volumeOverride: null },
    ]);
    expect(await getScenarioRows(calculationId)).toHaveLength(1);
  });

  it("does not create a second base when the step is opened again", async () => {
    const { user, calculationId } = await makeUserWithPricedDraft();
    await Promise.all([
      getScenarioComparisonService(user.id, db),
      getScenarioComparisonService(user.id, db),
    ]);

    await getScenarioComparisonService(user.id, db);

    expect(await getScenarioRows(calculationId)).toHaveLength(1);
  });

  it("compares the base built from the persisted costs and margin", async () => {
    const { user, calculationId } = await makeUserWithPricedDraft();

    const result = await getScenarioComparisonService(user.id, db);

    expect(result.calculationId).toBe(calculationId);
    expect(result.inputs).toEqual({
      totalFixed: "320000.00",
      variableUnit: "2500.00",
      unitCost: "4100.00",
      volume: 200,
      marginPct: "30",
    });
    expect(result.comparison).toMatchObject({
      ok: true,
      base: { price: "5857.14", realMarginPct: "30.00", estimatedProfit: "351428.57", breakEvenUnits: "96" },
    });
  });

  it("returns each alternative with its deltas against the base", async () => {
    const { user } = await makeUserWithPricedDraft();
    const alternativeId = await addAlternative(user.id);
    await updateScenarioService(
      user.id,
      { scenarioId: alternativeId, name: "Precio redondo", priceOverride: "5000", volumeOverride: null },
      db,
    );

    const result = await getScenarioComparisonService(user.id, db);

    expect(result.scenarios.map((s) => s.name)).toEqual(["Base", "Precio redondo"]);
    expect(result.comparison?.ok && result.comparison.scenarios[1]).toMatchObject({
      id: alternativeId,
      price: "5000.00",
      realMarginPct: "18.00",
      estimatedProfit: "180000.00",
      breakEvenUnits: "128",
      delta: { marginPoints: "-12.00", profit: "-171428.57", breakEvenUnits: "32" },
    });
  });

  it("returns the scenarios without a comparison while the margin is missing", async () => {
    const { user } = await makeUserWithDraft();
    await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "320000" }, db);

    const result = await getScenarioComparisonService(user.id, db);

    expect(result.scenarios).toHaveLength(1);
    expect(result).toMatchObject({ inputs: null, comparison: null });
  });

  it("returns the scenarios without a comparison while there are no costs", async () => {
    const { user } = await makeUserWithDraft();
    await saveExpectedMarginService(user.id, { expectedMarginPct: "30" }, db);

    const result = await getScenarioComparisonService(user.id, db);

    expect(result).toMatchObject({ inputs: null, comparison: null });
  });
});

describe("duplicateScenarioService", () => {
  it("copies the base as an alternative without overrides", async () => {
    const { user } = await makeUserWithPricedDraft();

    const created = await duplicateScenarioService(user.id, await baseIdOf(user.id), db);

    expect(created).toEqual({
      id: expect.any(String),
      name: "Base (copia)",
      isBase: false,
      priceOverride: null,
      volumeOverride: null,
    });
  });

  it("copies the name and the overrides of an alternative", async () => {
    const { user } = await makeUserWithPricedDraft();
    const alternativeId = await addAlternative(user.id);
    await updateScenarioService(
      user.id,
      { scenarioId: alternativeId, name: "Optimista", priceOverride: "6000.5", volumeOverride: 250 },
      db,
    );

    const created = await duplicateScenarioService(user.id, alternativeId, db);

    expect(created).toMatchObject({
      name: "Optimista (copia)",
      isBase: false,
      priceOverride: "6000.5",
      volumeOverride: 250,
    });
  });

  it("throws CALC_SCENARIO_LIMIT_REACHED when the draft already has 3 scenarios", async () => {
    const { user, calculationId } = await makeUserWithPricedDraft();
    await addAlternative(user.id);
    await addAlternative(user.id);

    await expect(
      duplicateScenarioService(user.id, await baseIdOf(user.id), db),
    ).rejects.toMatchObject({ code: "CALC_SCENARIO_LIMIT_REACHED" });

    expect(await getScenarioRows(calculationId)).toHaveLength(3);
  });

  it.each([
    ["a missing id", MISSING_ID],
    ["a non-uuid id", "not-a-uuid"],
  ])("throws CALC_SCENARIO_NOT_FOUND for %s", async (_name, scenarioId) => {
    const { user } = await makeUserWithPricedDraft();
    await getScenarioComparisonService(user.id, db);

    await expect(duplicateScenarioService(user.id, scenarioId, db)).rejects.toMatchObject({
      code: "CALC_SCENARIO_NOT_FOUND",
    });
  });

  it("throws CALC_DRAFT_MISSING when the user has no draft", async () => {
    const user = await makeUser();

    const promise = duplicateScenarioService(user.id, MISSING_ID, db);

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({ code: "CALC_DRAFT_MISSING" });
  });
});

describe("updateScenarioService", () => {
  it("saves the name and the overrides of an alternative", async () => {
    const { user, calculationId } = await makeUserWithPricedDraft();
    const alternativeId = await addAlternative(user.id);

    const updated = await updateScenarioService(
      user.id,
      { scenarioId: alternativeId, name: "  Más volumen  ", priceOverride: null, volumeOverride: 250 },
      db,
    );

    expect(updated).toEqual({
      id: alternativeId,
      name: "Más volumen",
      isBase: false,
      priceOverride: null,
      volumeOverride: 250,
    });
    const rows = await getScenarioRows(calculationId);
    expect(rows[1]).toMatchObject({ name: "Más volumen", priceOverride: null, volumeOverride: 250 });
  });

  it("clears the overrides when they are null", async () => {
    const { user } = await makeUserWithPricedDraft();
    const alternativeId = await addAlternative(user.id);
    await updateScenarioService(
      user.id,
      { scenarioId: alternativeId, name: "A", priceOverride: "5000", volumeOverride: 250 },
      db,
    );

    const updated = await updateScenarioService(
      user.id,
      { scenarioId: alternativeId, name: "A", priceOverride: null, volumeOverride: null },
      db,
    );

    expect(updated).toMatchObject({ priceOverride: null, volumeOverride: null });
  });

  it("throws CALC_SCENARIO_BASE_LOCKED and keeps the base as it was", async () => {
    const { user, calculationId } = await makeUserWithPricedDraft();
    const baseId = await baseIdOf(user.id);

    await expect(
      updateScenarioService(
        user.id,
        { scenarioId: baseId, name: "Otro", priceOverride: "5000", volumeOverride: null },
        db,
      ),
    ).rejects.toMatchObject({ code: "CALC_SCENARIO_BASE_LOCKED" });

    const [base] = await getScenarioRows(calculationId);
    expect(base).toMatchObject({ name: "Base", priceOverride: null, volumeOverride: null });
  });

  it("throws CALC_SCENARIO_INVALID_PRICE for a manual price of 0", async () => {
    const { user } = await makeUserWithPricedDraft();
    const alternativeId = await addAlternative(user.id);

    await expect(
      updateScenarioService(
        user.id,
        { scenarioId: alternativeId, name: "A", priceOverride: "0", volumeOverride: null },
        db,
      ),
    ).rejects.toMatchObject({ code: "CALC_SCENARIO_INVALID_PRICE" });
  });

  it.each([
    ["an empty name", { name: " ", priceOverride: null, volumeOverride: null }],
    ["a negative price", { name: "A", priceOverride: "-1", volumeOverride: null }],
    ["a price with 3 decimals", { name: "A", priceOverride: "10.123", volumeOverride: null }],
    ["a volume of 0", { name: "A", priceOverride: null, volumeOverride: 0 }],
    ["a fractional volume", { name: "A", priceOverride: null, volumeOverride: 2.5 }],
  ])("throws a ZodError for %s", async (_name, fields) => {
    const { user } = await makeUserWithPricedDraft();
    const alternativeId = await addAlternative(user.id);

    await expect(
      updateScenarioService(user.id, { scenarioId: alternativeId, ...fields }, db),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("user B cannot rename user A's alternative", async () => {
    const a = await makeUserWithPricedDraft();
    const b = await makeUserWithPricedDraft();
    const alternativeId = await addAlternative(a.user.id);

    await expect(
      updateScenarioService(
        b.user.id,
        { scenarioId: alternativeId, name: "Ajeno", priceOverride: null, volumeOverride: null },
        db,
      ),
    ).rejects.toMatchObject({ code: "CALC_SCENARIO_NOT_FOUND" });

    const rows = await getScenarioRows(a.calculationId);
    expect(rows[1]).toMatchObject({ name: "Base (copia)" });
  });
});

describe("deleteScenarioService", () => {
  it("deletes an alternative of the draft", async () => {
    const { user, calculationId } = await makeUserWithPricedDraft();
    const alternativeId = await addAlternative(user.id);

    await deleteScenarioService(user.id, alternativeId, db);

    const rows = await getScenarioRows(calculationId);
    expect(rows.map((row) => row.isBase)).toEqual([true]);
  });

  it("throws CALC_SCENARIO_BASE_LOCKED for the base", async () => {
    const { user, calculationId } = await makeUserWithPricedDraft();

    await expect(
      deleteScenarioService(user.id, await baseIdOf(user.id), db),
    ).rejects.toMatchObject({ code: "CALC_SCENARIO_BASE_LOCKED" });

    expect(await getScenarioRows(calculationId)).toHaveLength(1);
  });

  it("user B cannot delete user A's alternative", async () => {
    const a = await makeUserWithPricedDraft();
    const b = await makeUserWithPricedDraft();
    const alternativeId = await addAlternative(a.user.id);

    await expect(deleteScenarioService(b.user.id, alternativeId, db)).rejects.toMatchObject({
      code: "CALC_SCENARIO_NOT_FOUND",
    });

    expect(await getScenarioRows(a.calculationId)).toHaveLength(2);
  });
});
