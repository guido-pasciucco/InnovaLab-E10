import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { eq } from "drizzle-orm";

import { pricingInputs } from "@/lib/db/calculation/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { getDraftCalculationId, saveCalculatorSetupService } from "./calculator";
import { getCalculatorPricingInputsService, saveExpectedMarginService } from "./pricing";

// Integration tests against the local Supabase stack (.env.test URLs are
// local-only; loadTestEnv throws otherwise). One db client per file, closed in
// afterAll; users are removed after each test, cascading their draft and its
// pricing_inputs row.

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

async function makeUserWithDraft(): Promise<{ user: CreatedUser; calculationId: string }> {
  const user = await createUser();
  users.push(user);
  await saveCalculatorSetupService(user.id, validSetup, db);
  const calculationId = await getDraftCalculationId(user.id, db);
  if (calculationId === null) throw new Error("draft was not created");
  return { user, calculationId };
}

async function getPricingRows(calculationId: string) {
  return db.select().from(pricingInputs).where(eq(pricingInputs.calculationId, calculationId));
}

describe("saveExpectedMarginService", () => {
  it("creates the pricing row with the margin on price convention on the first save", async () => {
    const { user, calculationId } = await makeUserWithDraft();

    const result = await saveExpectedMarginService(user.id, { expectedMarginPct: "30" }, db);

    expect(result).toEqual({ expectedMarginPct: "30" });
    const rows = await getPricingRows(calculationId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      marginConvention: "sobre_precio",
      expectedMarginPct: "30.0000",
      manualPrice: null,
    });
  });

  it("updates the same row when the margin is saved again", async () => {
    const { user, calculationId } = await makeUserWithDraft();
    await saveExpectedMarginService(user.id, { expectedMarginPct: "30" }, db);

    await saveExpectedMarginService(user.id, { expectedMarginPct: "42.5" }, db);

    const rows = await getPricingRows(calculationId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.expectedMarginPct).toBe("42.5000");
  });

  it("rejects a margin of 100 % without writing a row", async () => {
    const { user, calculationId } = await makeUserWithDraft();

    await expect(
      saveExpectedMarginService(user.id, { expectedMarginPct: "100" }, db),
    ).rejects.toBeInstanceOf(ZodError);

    expect(await getPricingRows(calculationId)).toEqual([]);
  });

  it("throws CALC_DRAFT_MISSING when the user has no draft", async () => {
    const user = await createUser();
    users.push(user);

    await expect(
      saveExpectedMarginService(user.id, { expectedMarginPct: "30" }, db),
    ).rejects.toEqual(new AppError("CALC_DRAFT_MISSING"));
  });

  it("user B cannot overwrite user A's margin", async () => {
    const a = await makeUserWithDraft();
    const b = await makeUserWithDraft();
    await saveExpectedMarginService(a.user.id, { expectedMarginPct: "30" }, db);

    await saveExpectedMarginService(b.user.id, { expectedMarginPct: "10" }, db);

    expect((await getPricingRows(a.calculationId))[0]?.expectedMarginPct).toBe("30.0000");
  });
});

describe("getCalculatorPricingInputsService", () => {
  it("returns nulls when the user has no draft", async () => {
    const user = await createUser();
    users.push(user);

    const result = await getCalculatorPricingInputsService(user.id, db);

    expect(result).toEqual({ calculationId: null, expectedMarginPct: null });
  });

  it("returns a null margin when the draft has no pricing row", async () => {
    const { user, calculationId } = await makeUserWithDraft();

    const result = await getCalculatorPricingInputsService(user.id, db);

    expect(result).toEqual({ calculationId, expectedMarginPct: null });
  });

  it("returns the saved margin without trailing zeros", async () => {
    const { user, calculationId } = await makeUserWithDraft();
    await saveExpectedMarginService(user.id, { expectedMarginPct: "12.50" }, db);

    const result = await getCalculatorPricingInputsService(user.id, db);

    expect(result).toEqual({ calculationId, expectedMarginPct: "12.5" });
  });

  it("user B cannot read user A's margin", async () => {
    const a = await makeUserWithDraft();
    const b = await makeUserWithDraft();
    await saveExpectedMarginService(a.user.id, { expectedMarginPct: "30" }, db);

    const result = await getCalculatorPricingInputsService(b.user.id, db);

    expect(result).toEqual({ calculationId: b.calculationId, expectedMarginPct: null });
  });
});
