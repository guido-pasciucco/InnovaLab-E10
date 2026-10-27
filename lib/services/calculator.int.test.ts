import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ZodError } from "zod";
import { and, eq } from "drizzle-orm";

import { businesses, products } from "@/lib/db/business/table";
import { calculations, costingSetup } from "@/lib/db/calculation/table";
import { AppError } from "@/lib/errors/app-error";
import { getDrizzleClient, type Db } from "@/lib/db/client";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import {
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
    expect(await getCalculatorSetupService(session(user), db)).toBeNull();
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
    expect(await getCalculatorSetupService(session(userB), db)).toBeNull();
    expect(await getDraftCalculationId(session(userB), db)).toBeNull();

    // B saving creates B's own rows and leaves A untouched.
    const bInput = { ...validInput, name: "B product" };
    await saveCalculatorSetupService(session(userB), { ...bInput, userId: userA.id }, db);
    const updatedB = { ...bInput, volume: 12 };
    await saveCalculatorSetupService(session(userB), { ...updatedB, userId: userA.id }, db);

    expect(await getDraftCalculationId(session(userA), db)).toBe(draftIdA);
    expect(await getCalculatorSetupService(session(userA), db)).toEqual(validInput);
    expect(await getCalculatorSetupService(session(userB), db)).toEqual(updatedB);

    const aBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, userA.id));
    expect(aBusinesses).toHaveLength(1);
  });
});

describe("getDraftCalculationId", () => {
  it("rejects all protected operations when a real session is signed out", async () => {
    const user = await makeUser();
    const client = session(user);
    await saveCalculatorSetupService(client, validInput, db);
    const { error } = await client.auth.signOut();
    if (error) throw error;

    await expect(getDraftCalculationId(client, db)).rejects.toEqual(new AppError("UNAUTHORIZED"));
    await expect(getCalculatorSetupService(client, db)).rejects.toEqual(new AppError("UNAUTHORIZED"));
    await expect(saveCalculatorSetupService(client, { ...validInput, name: "Denied" }, db)).rejects.toEqual(new AppError("UNAUTHORIZED"));

    const { error: loginError } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
    if (loginError) throw loginError;
    expect(await getCalculatorSetupService(client, db)).toEqual(validInput);
  });
});

describe("getCalculatorSetupService", () => {
  it("uses the current session when the client switches users", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const client = session(userA);
    await saveCalculatorSetupService(client, validInput, db);

    const { error } = await client.auth.signInWithPassword({ email: userB.email, password: userB.password });
    if (error) throw error;

    expect(await getCalculatorSetupService(client, db)).toBeNull();
    await saveCalculatorSetupService(client, { ...validInput, name: "B current session" }, db);
    expect(await getCalculatorSetupService(session(userB), db)).toEqual({ ...validInput, name: "B current session" });
    const { error: restoreError } = await client.auth.signInWithPassword({ email: userA.email, password: userA.password });
    if (restoreError) throw restoreError;
    expect(await getCalculatorSetupService(client, db)).toEqual(validInput);
  });

  it("returns exactly what was saved", async () => {
    const user = await makeUser();
    await saveCalculatorSetupService(session(user), validInput, db);

    expect(await getCalculatorSetupService(session(user), db)).toEqual(validInput);
  });

  it("returns null for a user with no draft", async () => {
    const user = await makeUser();
    expect(await getCalculatorSetupService(session(user), db)).toBeNull();
  });
});
