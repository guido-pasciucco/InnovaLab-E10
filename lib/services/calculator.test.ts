import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { and, eq } from "drizzle-orm";

import { businesses, products } from "@/lib/db/business/table";
import { calculations, costingSetup } from "@/lib/db/calculation/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";

import { createUser, deleteUser, type CreatedUser } from "../../tests/e2e/factories/user";
import { loadTestEnv } from "../../tests/e2e/helpers/test-env";
import {
  getCalculatorSetupService,
  getDraftCalculationId,
  saveCalculatorSetupService,
} from "./calculator";

// Integration tests against the local Supabase stack (.env.test URLs are
// local-only; loadTestEnv throws otherwise). The db client is rebuilt from
// DATABASE_URL for each test; users are removed (profile + auth user) after
// each test, cascading their business/product/calculation/costing_setup rows.

const validInput = {
  name: "Velas de cera",
  unit: "unidad",
  volume: 48,
  currency: "ARS",
  period: "Mensual",
} as const;

let db: Db;
let users: CreatedUser[] = [];

beforeEach(() => {
  process.env.DATABASE_URL = loadTestEnv().DATABASE_URL;
  globalThis.__drizzleClient = undefined;
  db = getDrizzleClient();
});

afterEach(async () => {
  for (const user of users) {
    await deleteUser(user.id);
  }
  users = [];
});

async function makeUser(): Promise<CreatedUser> {
  const user = await createUser();
  users.push(user);
  return user;
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

  it("rejects invalid input with ZodError and writes nothing", async () => {
    const user = await makeUser();

    await expect(
      saveCalculatorSetupService(user.id, { ...validInput, volume: 0 }, db),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      saveCalculatorSetupService(user.id, { ...validInput, volume: -1 }, db),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      saveCalculatorSetupService(user.id, { ...validInput, volume: 1.5 }, db),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      saveCalculatorSetupService(user.id, { ...validInput, name: "  " }, db),
    ).rejects.toBeInstanceOf(ZodError);

    expect(await getDraftCalculationId(user.id, db)).toBeNull();
    expect(await getCalculatorSetupService(user.id, db)).toBeNull();
    const businessRows = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, user.id));
    expect(businessRows).toHaveLength(0);
  });

  it("rejects currency USD and period Anual", async () => {
    const user = await makeUser();

    await expect(
      saveCalculatorSetupService(user.id, { ...validInput, currency: "USD" }, db),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      saveCalculatorSetupService(user.id, { ...validInput, period: "Anual" }, db),
    ).rejects.toBeInstanceOf(ZodError);

    expect(await getDraftCalculationId(user.id, db)).toBeNull();
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

describe("owner isolation", () => {
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
