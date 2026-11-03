import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { businesses, products } from "@/lib/db/business/table";
import { activeCalculations, calculations } from "@/lib/db/calculation/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import {
  createCalculationService,
  listUserCalculationsService,
  resolveActiveCalculation,
  setActiveCalculationService,
} from "./calculations";
import { getProfileSummaryService } from "./profile";

// Integration tests against the local Supabase stack (see calculator.int.test.ts).

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
  await Promise.all(users.map((user) => deleteUser(user.id)));
  users.length = 0;
});

async function makeUser(): Promise<CreatedUser> {
  const user = await createUser();
  users.push(user);
  return user;
}

// Seeds a calculation directly; `createdAt` makes "newer" deterministic.
async function seedCalculation(
  userId: string,
  opts: { name?: string; currentStep?: number; createdAt?: Date; status?: string } = {},
) {
  const [business] = await db
    .insert(businesses)
    .values({ name: "Mi negocio", ownerUserId: userId })
    .returning();
  const [product] = await db
    .insert(products)
    .values({ name: opts.name ?? "Producto", businessId: business.id })
    .returning();
  const [calculation] = await db
    .insert(calculations)
    .values({
      userId,
      businessId: business.id,
      productId: product.id,
      currentStep: opts.currentStep ?? 1,
      status: opts.status ?? "draft",
      createdAt: opts.createdAt ?? new Date(),
    })
    .returning();
  return calculation;
}

const older = new Date("2026-01-01T00:00:00Z");
const newer = new Date("2026-02-01T00:00:00Z");

async function pointerOf(userId: string) {
  const [row] = await db
    .select()
    .from(activeCalculations)
    .where(eq(activeCalculations.userId, userId));
  return row?.calculationId ?? null;
}

describe("resolveActiveCalculation", () => {
  it("returns null when the user has no calculations", async () => {
    const user = await makeUser();
    expect(await resolveActiveCalculation(user.id, db)).toBeNull();
  });

  it("falls back to the latest draft without a pointer", async () => {
    const user = await makeUser();
    await seedCalculation(user.id, { createdAt: older });
    const latest = await seedCalculation(user.id, { createdAt: newer, currentStep: 3 });

    const resolved = await resolveActiveCalculation(user.id, db);

    expect(resolved).toEqual({
      id: latest.id,
      productId: latest.productId,
      currentStep: 3,
    });
  });

  it("prefers the pointer over a newer draft", async () => {
    const user = await makeUser();
    const x = await seedCalculation(user.id, { createdAt: older });
    await seedCalculation(user.id, { createdAt: newer });
    await setActiveCalculationService(user.id, x.id, db);

    expect((await resolveActiveCalculation(user.id, db))?.id).toBe(x.id);
  });

  it("ignores a pointer to another user's calculation", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const own = await seedCalculation(a.id);
    const foreign = await seedCalculation(b.id);
    await db.insert(activeCalculations).values({ userId: a.id, calculationId: foreign.id });

    expect((await resolveActiveCalculation(a.id, db))?.id).toBe(own.id);
  });

  it("falls back when the pointed calculation is deleted", async () => {
    const user = await makeUser();
    const kept = await seedCalculation(user.id, { createdAt: older });
    const doomed = await seedCalculation(user.id, { createdAt: newer });
    await setActiveCalculationService(user.id, doomed.id, db);
    await db.delete(calculations).where(eq(calculations.id, doomed.id));

    expect(await pointerOf(user.id)).toBeNull();
    expect((await resolveActiveCalculation(user.id, db))?.id).toBe(kept.id);
  });
});

describe("setActiveCalculationService", () => {
  it("sets the pointer and returns the persisted step", async () => {
    const user = await makeUser();
    const x = await seedCalculation(user.id, { currentStep: 4 });

    const result = await setActiveCalculationService(user.id, x.id, db);

    expect(result).toEqual({ calculationId: x.id, currentStep: 4 });
    expect(await pointerOf(user.id)).toBe(x.id);
  });

  it("is idempotent", async () => {
    const user = await makeUser();
    const x = await seedCalculation(user.id);

    await setActiveCalculationService(user.id, x.id, db);
    await setActiveCalculationService(user.id, x.id, db);

    expect(await pointerOf(user.id)).toBe(x.id);
    expect(await db.select().from(calculations).where(eq(calculations.userId, user.id))).toHaveLength(1);
  });

  it.each([
    ["foreign", async (_a: CreatedUser, b: CreatedUser) => (await seedCalculation(b.id)).id],
    ["missing", async () => "3f2a4c1e-8b7d-4e5f-9a6b-1c2d3e4f5a6b"],
    ["non-uuid", async () => "not-a-uuid"],
  ])("rejects a %s id with CALC_NOT_FOUND and keeps the pointer", async (_label, makeId) => {
    const a = await makeUser();
    const b = await makeUser();
    const own = await seedCalculation(a.id);
    await setActiveCalculationService(a.id, own.id, db);
    const id = await makeId(a, b);

    await expect(setActiveCalculationService(a.id, id, db)).rejects.toMatchObject({
      code: "CALC_NOT_FOUND",
    });
    await expect(setActiveCalculationService(a.id, id, db)).rejects.toBeInstanceOf(AppError);
    expect(await pointerOf(a.id)).toBe(own.id);
  });
});

describe("createCalculationService", () => {
  it("creates a draft at step 1, makes it active and leaves other drafts alone", async () => {
    const user = await makeUser();
    const existing = await seedCalculation(user.id, { currentStep: 3, createdAt: older });

    const created = await createCalculationService(user.id, db);

    expect(created.calculationId).not.toBe(existing.id);
    const rows = await db.select().from(calculations).where(eq(calculations.userId, user.id));
    expect(rows).toHaveLength(2);
    const row = rows.find((r) => r.id === created.calculationId);
    expect(row).toMatchObject({ status: "draft", currentStep: 1 });
    expect(rows.find((r) => r.id === existing.id)?.currentStep).toBe(3);
    expect(await pointerOf(user.id)).toBe(created.calculationId);
  });
});

describe("listUserCalculationsService", () => {
  it("lists only the user's calculations, newest update first, flagging the active one", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const first = await seedCalculation(a.id, { name: "Primero", currentStep: 3 });
    const second = await seedCalculation(a.id, { name: "Segundo", currentStep: 5 });
    await seedCalculation(b.id, { name: "Ajeno" });
    await db
      .update(calculations)
      .set({ updatedAt: new Date("2030-01-01T00:00:00Z") })
      .where(eq(calculations.id, first.id));
    await setActiveCalculationService(a.id, second.id, db);

    const list = await listUserCalculationsService(a.id, db);

    expect(list.map((c) => c.productName)).toEqual(["Primero", "Segundo"]);
    expect(list.map((c) => c.currentStep)).toEqual([3, 5]);
    expect(list.map((c) => c.isActive)).toEqual([false, true]);
  });
});

describe("getProfileSummaryService", () => {
  it("returns the display name of the user's profile", async () => {
    const user = await makeUser();
    const summary = await getProfileSummaryService(user.id, db);
    expect(summary).toHaveProperty("displayName");
  });
});
