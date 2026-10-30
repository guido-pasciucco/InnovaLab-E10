import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { calcCostLines } from "@/lib/db/costs/table";
import { AppError } from "@/lib/errors/app-error";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { getDraftCalculationId, saveCalculatorSetupService } from "./calculator";
import {
  addCalcCostLineService,
  listCalcCostLinesService,
  removeCalcCostLineService,
  updateCalcCostLineAmountService,
} from "./cost";

// Integration tests against the local Supabase stack. One pool per file.
// Each test creates its users and deleteUser cascades the draft and its lines.

const setupInput = {
  name: "Vela de soja 200 g",
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

async function saveDraft(userId: string): Promise<void> {
  await saveCalculatorSetupService(userId, setupInput, db);
}

describe("listCalcCostLinesService", () => {
  it("throws CALC_DRAFT_MISSING when the user has no draft", async () => {
    const user = await makeUser();

    await expect(listCalcCostLinesService(user.id, {}, db)).rejects.toEqual(
      new AppError("CALC_DRAFT_MISSING"),
    );
  });

  it("returns an empty list and a zero total when the draft has no cost lines", async () => {
    const user = await makeUser();
    await saveDraft(user.id);

    const result = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);

    expect(result).toEqual({ lines: [], totalFixed: "0.00" });
  });

  it("returns the caller's fixed lines ordered by createdAt", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const herramientas = await addCalcCostLineService(
      user.id,
      { concept: "Herramientas y suscripciones", amount: "10000.00" },
      db,
    );
    const alquiler = await addCalcCostLineService(
      user.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );
    const servicios = await addCalcCostLineService(
      user.id,
      { concept: "Servicios", amount: "20000.00" },
      db,
    );
    await db
      .update(calcCostLines)
      .set({ createdAt: new Date("2026-03-01T00:00:00.000Z") })
      .where(eq(calcCostLines.id, herramientas.id));
    await db
      .update(calcCostLines)
      .set({ createdAt: new Date("2026-01-01T00:00:00.000Z") })
      .where(eq(calcCostLines.id, alquiler.id));
    await db
      .update(calcCostLines)
      .set({ createdAt: new Date("2026-02-01T00:00:00.000Z") })
      .where(eq(calcCostLines.id, servicios.id));

    const result = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);

    expect(result.lines.map((line) => line.concept)).toEqual([
      "Alquiler",
      "Servicios",
      "Herramientas y suscripciones",
    ]);
  });

  it("sums the filtered fixed lines when the paso 2 amounts are listed", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "60000.00" }, db);
    await addCalcCostLineService(user.id, { concept: "Servicios", amount: "20000.00" }, db);
    await addCalcCostLineService(
      user.id,
      { concept: "Herramientas y suscripciones", amount: "10000.00" },
      db,
    );

    const result = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);

    expect(result.totalFixed).toBe("90000.00");
  });

  it("keeps the cent when the fixed amounts are 0.10 and 0.20", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addCalcCostLineService(user.id, { concept: "A", amount: "0.10" }, db);
    await addCalcCostLineService(user.id, { concept: "B", amount: "0.20" }, db);

    const result = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);

    expect(result.totalFixed).toBe("0.30");
  });

  it("omits variable lines when the behavior filter is fixed", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const draftId = await getDraftCalculationId(user.id, db);
    await db.insert(calcCostLines).values({
      calculationId: draftId!,
      concept: "Harina",
      behavior: "variable",
      traceability: "direct",
      amount: "5000.00",
      sourceBusinessCostId: null,
    });
    await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "60000.00" }, db);

    const result = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);

    expect(result.lines.map((line) => line.concept)).toEqual(["Alquiler"]);
    expect(result.totalFixed).toBe("60000.00");
  });
});

describe("addCalcCostLineService", () => {
  it("throws CALC_DRAFT_MISSING when the user has no draft", async () => {
    const user = await makeUser();

    await expect(
      addCalcCostLineService(user.id, { concept: "Alquiler", amount: "60000.00" }, db),
    ).rejects.toEqual(new AppError("CALC_DRAFT_MISSING"));
  });

  it("persists a fixed line with a decimal amount and a null catalog source", async () => {
    const user = await makeUser();
    await saveDraft(user.id);

    const created = await addCalcCostLineService(
      user.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );

    expect(created.behavior).toBe("fixed");
    expect(created.traceability).toBe("direct");
    expect(created.sourceBusinessCostId).toBeNull();
    expect(created.amount).toBe("60000.00");
    expect(typeof created.amount).toBe("string");

    const stored = await db
      .select()
      .from(calcCostLines)
      .where(eq(calcCostLines.id, created.id));
    expect(stored).toHaveLength(1);
    expect(stored[0].sourceBusinessCostId).toBeNull();
  });

  it("rejects a negative amount without inserting a line", async () => {
    const user = await makeUser();
    await saveDraft(user.id);

    await expect(
      addCalcCostLineService(user.id, { concept: "Alquiler", amount: "-1" }, db),
    ).rejects.toBeInstanceOf(ZodError);

    const result = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);
    expect(result.lines).toEqual([]);
  });

  it("user B cannot read or overwrite user A's cost lines", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await saveDraft(userA.id);
    await saveDraft(userB.id);
    const lineA = await addCalcCostLineService(
      userA.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );

    await addCalcCostLineService(userB.id, { concept: "Servicios", amount: "20000.00" }, db);

    const listA = await listCalcCostLinesService(userA.id, { behavior: "fixed" }, db);
    const listB = await listCalcCostLinesService(userB.id, { behavior: "fixed" }, db);
    expect(listA.lines.map((line) => line.id)).toEqual([lineA.id]);
    expect(listB.lines.map((line) => line.concept)).toEqual(["Servicios"]);

    const storedA = await db
      .select()
      .from(calcCostLines)
      .where(eq(calcCostLines.calculationId, lineA.calculationId));
    expect(storedA).toHaveLength(1);
    expect(storedA[0].concept).toBe("Alquiler");
  });
});

const UNKNOWN_LINE_ID = "6f1c2b7e-3d4a-4f5b-9c8d-1e2f3a4b5c6d";

describe("updateCalcCostLineAmountService", () => {
  it("replaces the amount and keeps the concept and the axes", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const alquiler = await addCalcCostLineService(
      user.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );
    await addCalcCostLineService(user.id, { concept: "Servicios", amount: "20000.00" }, db);

    const updated = await updateCalcCostLineAmountService(
      user.id,
      alquiler.id,
      { amount: "70000.00", concept: "Otro", behavior: "variable" },
      db,
    );

    expect(updated).toMatchObject({
      id: alquiler.id,
      concept: "Alquiler",
      behavior: "fixed",
      traceability: "direct",
      amount: "70000.00",
    });
    const listed = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);
    expect(listed.lines.find((line) => line.concept === "Alquiler")?.amount).toBe("70000.00");
    expect(listed.lines.find((line) => line.concept === "Servicios")?.amount).toBe("20000.00");
    expect(listed.totalFixed).toBe("90000.00");
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the line belongs to another user", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await saveDraft(userA.id);
    await saveDraft(userB.id);
    const lineA = await addCalcCostLineService(
      userA.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );

    await expect(
      updateCalcCostLineAmountService(userB.id, lineA.id, { amount: "1.00" }, db),
    ).rejects.toEqual(new AppError("CALC_COST_LINE_NOT_FOUND"));

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, lineA.id));
    expect(stored[0].amount).toBe("60000.00");
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the id does not exist", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "60000.00" }, db);

    await expect(
      updateCalcCostLineAmountService(user.id, UNKNOWN_LINE_ID, { amount: "1.00" }, db),
    ).rejects.toEqual(new AppError("CALC_COST_LINE_NOT_FOUND"));

    const listed = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);
    expect(listed.lines.map((line) => line.amount)).toEqual(["60000.00"]);
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the line is variable", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const draftId = await getDraftCalculationId(user.id, db);
    const [variable] = await db
      .insert(calcCostLines)
      .values({
        calculationId: draftId!,
        concept: "Harina",
        behavior: "variable",
        traceability: "direct",
        amount: "5000.00",
        sourceBusinessCostId: null,
      })
      .returning();

    await expect(
      updateCalcCostLineAmountService(user.id, variable.id, { amount: "1.00" }, db),
    ).rejects.toEqual(new AppError("CALC_COST_LINE_NOT_FOUND"));

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, variable.id));
    expect(stored[0].amount).toBe("5000.00");
  });

  it("rejects an invalid amount without changing the line", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const alquiler = await addCalcCostLineService(
      user.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );

    await expect(
      updateCalcCostLineAmountService(user.id, alquiler.id, { amount: "-1" }, db),
    ).rejects.toBeInstanceOf(ZodError);

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, alquiler.id));
    expect(stored[0].amount).toBe("60000.00");
  });
});

describe("removeCalcCostLineService", () => {
  it("removes the line and leaves totalFixed without it", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const alquiler = await addCalcCostLineService(
      user.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );
    await addCalcCostLineService(user.id, { concept: "Servicios", amount: "20000.00" }, db);

    await removeCalcCostLineService(user.id, alquiler.id, db);

    const listed = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);
    expect(listed.lines.map((line) => line.concept)).toEqual(["Servicios"]);
    expect(listed.totalFixed).toBe("20000.00");
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the line belongs to another user", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await saveDraft(userA.id);
    await saveDraft(userB.id);
    const lineA = await addCalcCostLineService(
      userA.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );

    await expect(removeCalcCostLineService(userB.id, lineA.id, db)).rejects.toEqual(
      new AppError("CALC_COST_LINE_NOT_FOUND"),
    );

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, lineA.id));
    expect(stored).toHaveLength(1);
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the id does not exist", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "60000.00" }, db);

    await expect(removeCalcCostLineService(user.id, UNKNOWN_LINE_ID, db)).rejects.toEqual(
      new AppError("CALC_COST_LINE_NOT_FOUND"),
    );

    const listed = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);
    expect(listed.lines).toHaveLength(1);
  });
});
