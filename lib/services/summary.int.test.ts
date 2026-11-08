import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { getDrizzleClient, type Db } from "@/lib/db/client";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { getDraftCalculationIdForUser, saveCalculatorSetupForUser } from "./calculator";
import { addCalcCostLineService, addVariableCalcCostLineService } from "./cost";
import { saveExpectedMarginService } from "./pricing";
import { getCalculatorSummaryService } from "./summary";

// Integration tests against the local Supabase stack (.env.test URLs are
// local-only; loadTestEnv throws otherwise). One db client per file, closed in
// afterAll; users are removed after each test, cascading their draft.
//
// Mockup example shared with steps 5 to 7: fixed 320.000, variable 2.500 per
// unit, 200 units and a 30 % margin.

const validSetup = {
  name: "Velas de cera",
  unit: "unidad",
  volume: 200,
  currency: "ARS",
  period: "Mensual",
} as const;

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

async function makeUserWithCostedDraft(): Promise<{ user: CreatedUser; calculationId: string }> {
  const user = await makeUser();
  await saveCalculatorSetupForUser(user.id, validSetup, db);
  const calculationId = await getDraftCalculationIdForUser(user.id, db);
  if (calculationId === null) throw new Error("draft was not created");
  await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "320000" }, db);
  await addVariableCalcCostLineService(user.id, { concept: "Envase", amount: "2500" }, db);
  return { user, calculationId };
}

describe("getCalculatorSummaryService", () => {
  it("summarizes the saved costs and margin with the engine figures", async () => {
    const { user, calculationId } = await makeUserWithCostedDraft();
    await saveExpectedMarginService(user.id, { expectedMarginPct: "30" }, db);

    const result = await getCalculatorSummaryService(user.id, db);

    expect(result).toEqual({
      calculationId,
      status: "ready",
      productName: "Velas de cera",
      period: "Mensual",
      volume: 200,
      unitCost: "4100.00",
      suggestedPrice: "5857.14",
      realMarginPct: "30.00",
      estimatedProfit: "351428.57",
      breakEvenUnits: "96",
      breakEvenSales: "558298.08",
      currency: "ARS",
    });
  });

  it("returns no draft and no figures when the user has no draft", async () => {
    const user = await makeUser();

    const result = await getCalculatorSummaryService(user.id, db);

    expect(result).toEqual({
      calculationId: null,
      status: "missing-costs",
      productName: null,
      period: null,
      volume: null,
      unitCost: null,
      suggestedPrice: null,
      realMarginPct: null,
      estimatedProfit: null,
      breakEvenUnits: null,
      breakEvenSales: null,
      currency: "ARS",
    });
  });

  it("keeps the unit cost but no price when the margin was never saved", async () => {
    const { user, calculationId } = await makeUserWithCostedDraft();

    const result = await getCalculatorSummaryService(user.id, db);

    expect(result).toMatchObject({
      calculationId,
      status: "missing-margin",
      productName: "Velas de cera",
      volume: 200,
      unitCost: "4100.00",
      suggestedPrice: null,
      realMarginPct: null,
      estimatedProfit: null,
      breakEvenUnits: null,
      breakEvenSales: null,
    });
  });

  it("reports missing costs for a draft without cost lines", async () => {
    const user = await makeUser();
    await saveCalculatorSetupForUser(user.id, validSetup, db);
    await saveExpectedMarginService(user.id, { expectedMarginPct: "30" }, db);

    const result = await getCalculatorSummaryService(user.id, db);

    expect(result).toMatchObject({ status: "missing-costs", unitCost: null, suggestedPrice: null });
  });

  it("user B never sees user A's figures", async () => {
    const a = await makeUserWithCostedDraft();
    await saveExpectedMarginService(a.user.id, { expectedMarginPct: "30" }, db);
    const b = await makeUser();
    await saveCalculatorSetupForUser(b.id,{ ...validSetup, name: "Otro" }, db);

    const result = await getCalculatorSummaryService(b.id, db);

    expect(result).toMatchObject({ productName: "Otro", status: "missing-costs", unitCost: null });
    expect(result.calculationId).not.toBe(a.calculationId);
  });
});
