import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { VerifiedUserId } from "./auth";
import { ZodError } from "zod";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";

import {
  createUser,
  deleteUser,
  type CreatedUser,
} from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import {
  addPeriodCostLineService,
  listPeriodCostsService,
  removePeriodCostLineService,
  updatePeriodCostLineAmountService,
  updatePeriodCostLineConceptService,
} from "./business-cost";

// Integration tests against the local Supabase stack. One pool per file.
// Each test creates its users and deleteUser cascades their business and its
// period expenses.

const PERIOD = "2026-11";
const NEXT_PERIOD = "2026-12";

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
  const failures = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected",
  );
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((f) => f.reason),
      `cleanup failed for ${failures.length} user(s)`,
    );
  }
});

async function makeUser(): Promise<VerifiedUserId> {
  const user = await createUser();
  users.push(user);
  return user.id;
}

describe("listPeriodCostsService", () => {
  it("returns an empty period with a zero total when the user has no business", async () => {
    const userId = await makeUser();

    const result = await listPeriodCostsService(userId, { period: PERIOD }, db);

    expect(result).toEqual({ period: PERIOD, lines: [], total: "0.00" });
  });

  it("returns the saved period expenses and their exact total when they exist", async () => {
    const userId = await makeUser();
    await addPeriodCostLineService(
      userId,
      { period: PERIOD, concept: "Alquiler del taller", amountPeriod: "150000.00" },
      db,
    );
    await addPeriodCostLineService(
      userId,
      { period: PERIOD, concept: "Luz y gas", amountPeriod: "25000.50" },
      db,
    );

    const result = await listPeriodCostsService(userId, { period: PERIOD }, db);

    expect(result.lines.map((line) => line.concept)).toEqual([
      "Alquiler del taller",
      "Luz y gas",
    ]);
    expect(result.total).toBe("175000.50");
  });

  it("keeps the same total after reading the period again", async () => {
    const userId = await makeUser();
    await addPeriodCostLineService(
      userId,
      { period: PERIOD, concept: "Alquiler del taller", amountPeriod: "150000.00" },
      db,
    );

    const first = await listPeriodCostsService(userId, { period: PERIOD }, db);
    const second = await listPeriodCostsService(userId, { period: PERIOD }, db);

    expect(second.total).toBe(first.total);
    expect(second.lines.map((line) => line.id)).toEqual(
      first.lines.map((line) => line.id),
    );
  });

  it("keeps each month's expenses separate", async () => {
    const userId = await makeUser();
    await addPeriodCostLineService(
      userId,
      { period: PERIOD, concept: "Alquiler del taller", amountPeriod: "150000.00" },
      db,
    );
    await addPeriodCostLineService(
      userId,
      { period: NEXT_PERIOD, concept: "Alquiler del taller", amountPeriod: "180000.00" },
      db,
    );

    const november = await listPeriodCostsService(userId, { period: PERIOD }, db);
    const december = await listPeriodCostsService(userId, { period: NEXT_PERIOD }, db);

    expect(november.total).toBe("150000.00");
    expect(december.total).toBe("180000.00");
  });
});

describe("addPeriodCostLineService", () => {
  it("stores the period expense as a fixed indirect cost of the user's business", async () => {
    const userId = await makeUser();

    const created = await addPeriodCostLineService(
      userId,
      { period: PERIOD, concept: "Alquiler del taller", amountPeriod: "150000.00" },
      db,
    );

    expect(created).toMatchObject({
      concept: "Alquiler del taller",
      period: PERIOD,
      amountPeriod: "150000.00",
      behavior: "fixed",
      traceability: "indirect",
    });
  });

  it("throws VALIDATION when the period is malformed", async () => {
    const userId = await makeUser();

    await expect(
      addPeriodCostLineService(
        userId,
        { period: "2026-13", concept: "Alquiler", amountPeriod: "10.00" },
        db,
      ),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe("updatePeriodCostLineAmountService", () => {
  it("updates the amount without changing the concept", async () => {
    const userId = await makeUser();
    const created = await addPeriodCostLineService(
      userId,
      { period: PERIOD, concept: "Alquiler del taller", amountPeriod: "150000.00" },
      db,
    );

    const updated = await updatePeriodCostLineAmountService(
      userId,
      created.id,
      { amountPeriod: "165000.00" },
      db,
    );

    expect(updated).toMatchObject({
      id: created.id,
      concept: "Alquiler del taller",
      amountPeriod: "165000.00",
    });
  });
});

describe("updatePeriodCostLineConceptService", () => {
  it("updates the concept without changing the amount", async () => {
    const userId = await makeUser();
    const created = await addPeriodCostLineService(
      userId,
      { period: PERIOD, concept: "Alquiler del taller", amountPeriod: "150000.00" },
      db,
    );

    const updated = await updatePeriodCostLineConceptService(
      userId,
      created.id,
      { concept: "Alquiler del local" },
      db,
    );

    expect(updated).toMatchObject({
      id: created.id,
      concept: "Alquiler del local",
      amountPeriod: "150000.00",
    });
  });
});

describe("removePeriodCostLineService", () => {
  it("removes the line and keeps the remaining total", async () => {
    const userId = await makeUser();
    const rent = await addPeriodCostLineService(
      userId,
      { period: PERIOD, concept: "Alquiler del taller", amountPeriod: "150000.00" },
      db,
    );
    await addPeriodCostLineService(
      userId,
      { period: PERIOD, concept: "Luz y gas", amountPeriod: "25000.50" },
      db,
    );

    await removePeriodCostLineService(userId, rent.id, db);
    const result = await listPeriodCostsService(userId, { period: PERIOD }, db);

    expect(result.total).toBe("25000.50");
    expect(result.lines.map((line) => line.concept)).toEqual(["Luz y gas"]);
  });
});

describe("owner scoping", () => {
  it("user B cannot read, update or remove user A's period expenses", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const lineA = await addPeriodCostLineService(
      userA,
      { period: PERIOD, concept: "Alquiler de A", amountPeriod: "150000.00" },
      db,
    );
    // B has its own business, so the miss is the line scope, not a missing business.
    await addPeriodCostLineService(
      userB,
      { period: PERIOD, concept: "Alquiler de B", amountPeriod: "90000.00" },
      db,
    );

    const listB = await listPeriodCostsService(userB, { period: PERIOD }, db);

    expect(listB.lines.map((line) => line.concept)).toEqual(["Alquiler de B"]);
    await expect(
      updatePeriodCostLineAmountService(userB, lineA.id, { amountPeriod: "1.00" }, db),
    ).rejects.toMatchObject({ code: "COST_CATALOG_LINE_NOT_FOUND" });
    await expect(removePeriodCostLineService(userB, lineA.id, db)).rejects.toMatchObject({
      code: "COST_CATALOG_LINE_NOT_FOUND",
    });
  });

  it("throws COST_CATALOG_LINE_NOT_FOUND for a non-uuid line id", async () => {
    const userId = await makeUser();

    await expect(
      removePeriodCostLineService(userId, "not-a-uuid", db),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      removePeriodCostLineService(userId, "not-a-uuid", db),
    ).rejects.toMatchObject({ code: "COST_CATALOG_LINE_NOT_FOUND" });
  });
});
