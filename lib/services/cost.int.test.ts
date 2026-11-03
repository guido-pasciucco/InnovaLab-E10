import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";

import { businesses } from "@/lib/db/business/table";
import { calculations } from "@/lib/db/calculation/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { businessCostLines, calcCostLines } from "@/lib/db/costs/table";
import { AppError } from "@/lib/errors/app-error";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { getDraftCalculationId, saveCalculatorSetupService } from "./calculator";
import {
  addCalcCostLineService,
  addVariableCalcCostLineService,
  listCalcCostLinesService,
  listVariableCalcCostLinesService,
  removeCalcCostLineService,
  removeVariableCalcCostLineService,
  updateCalcCostLineAmountService,
  updateCalcCostLineConceptService,
  updateVariableCalcCostLineAmountService,
  updateVariableCalcCostLineConceptService,
  updateVariableCalcCostLineYieldService,
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

  it("sums only fixed lines when the list is unfiltered", async () => {
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

    const result = await listCalcCostLinesService(user.id, {}, db);

    expect(result.lines.map((line) => line.concept).sort()).toEqual(["Alquiler", "Harina"]);
    expect(result.totalFixed).toBe("60000.00");
  });

  it("sums the requested variable lines when the behavior filter is variable", async () => {
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

    const result = await listCalcCostLinesService(user.id, { behavior: "variable" }, db);

    expect(result.lines.map((line) => line.concept)).toEqual(["Harina"]);
    expect(result.totalFixed).toBe("5000.00");
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
  it("throws CALC_DRAFT_MISSING when the user has no draft", async () => {
    const user = await makeUser();

    await expect(
      updateCalcCostLineAmountService(user.id, crypto.randomUUID(), { amount: "1.00" }, db),
    ).rejects.toEqual(new AppError("CALC_DRAFT_MISSING"));
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the line id is not a uuid", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "60000.00" }, db);

    await expect(
      updateCalcCostLineAmountService(user.id, "abc", { amount: "1.00" }, db),
    ).rejects.toEqual(new AppError("CALC_COST_LINE_NOT_FOUND"));

    const listed = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);
    expect(listed.lines).toHaveLength(1);
    expect(listed.lines[0].amount).toBe("60000.00");
  });

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

describe("updateCalcCostLineConceptService", () => {
  it("throws CALC_DRAFT_MISSING when the user has no draft", async () => {
    const user = await makeUser();

    await expect(
      updateCalcCostLineConceptService(user.id, crypto.randomUUID(), { concept: "Otro" }, db),
    ).rejects.toEqual(new AppError("CALC_DRAFT_MISSING"));
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the line id is not a uuid", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "60000.00" }, db);

    await expect(
      updateCalcCostLineConceptService(user.id, "abc", { concept: "Otro" }, db),
    ).rejects.toEqual(new AppError("CALC_COST_LINE_NOT_FOUND"));
  });

  it("renames the line and keeps the amount and the axes", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const alquiler = await addCalcCostLineService(
      user.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );
    await addCalcCostLineService(user.id, { concept: "Servicios", amount: "20000.00" }, db);

    const updated = await updateCalcCostLineConceptService(
      user.id,
      alquiler.id,
      { concept: "  Alquiler del local  ", amount: "1.00", behavior: "variable" },
      db,
    );

    expect(updated).toMatchObject({
      id: alquiler.id,
      concept: "Alquiler del local",
      behavior: "fixed",
      traceability: "direct",
      amount: "60000.00",
    });
    const listed = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);
    expect(listed.lines.map((line) => line.concept).sort()).toEqual([
      "Alquiler del local",
      "Servicios",
    ]);
    expect(listed.totalFixed).toBe("80000.00");
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
      updateCalcCostLineConceptService(userB.id, lineA.id, { concept: "Otro" }, db),
    ).rejects.toEqual(new AppError("CALC_COST_LINE_NOT_FOUND"));

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, lineA.id));
    expect(stored[0].concept).toBe("Alquiler");
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the id does not exist", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "60000.00" }, db);

    await expect(
      updateCalcCostLineConceptService(user.id, UNKNOWN_LINE_ID, { concept: "Otro" }, db),
    ).rejects.toEqual(new AppError("CALC_COST_LINE_NOT_FOUND"));

    const listed = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);
    expect(listed.lines.map((line) => line.concept)).toEqual(["Alquiler"]);
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
      updateCalcCostLineConceptService(user.id, variable.id, { concept: "Otro" }, db),
    ).rejects.toEqual(new AppError("CALC_COST_LINE_NOT_FOUND"));

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, variable.id));
    expect(stored[0].concept).toBe("Harina");
  });

  it.each([
    ["empty", "   "],
    ["too long", "a".repeat(201)],
  ])("rejects a concept that is %s without changing the line", async (_name, concept) => {
    const user = await makeUser();
    await saveDraft(user.id);
    const alquiler = await addCalcCostLineService(
      user.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );

    await expect(
      updateCalcCostLineConceptService(user.id, alquiler.id, { concept }, db),
    ).rejects.toBeInstanceOf(ZodError);

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, alquiler.id));
    expect(stored[0].concept).toBe("Alquiler");
  });
});

describe("removeCalcCostLineService", () => {
  it("throws CALC_DRAFT_MISSING when the user has no draft", async () => {
    const user = await makeUser();

    await expect(removeCalcCostLineService(user.id, crypto.randomUUID(), db)).rejects.toEqual(
      new AppError("CALC_DRAFT_MISSING"),
    );
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the line id is not a uuid", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "60000.00" }, db);

    await expect(removeCalcCostLineService(user.id, "abc", db)).rejects.toEqual(
      new AppError("CALC_COST_LINE_NOT_FOUND"),
    );

    const listed = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);
    expect(listed.lines).toHaveLength(1);
    expect(listed.lines[0].amount).toBe("60000.00");
  });

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

describe("listVariableCalcCostLinesService", () => {
  it("throws CALC_DRAFT_MISSING when the user has no draft", async () => {
    const user = await makeUser();

    await expect(listVariableCalcCostLinesService(user.id, db)).rejects.toEqual(
      new AppError("CALC_DRAFT_MISSING"),
    );
  });

  it("returns an empty list and a zero total when the draft has no variable lines", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "60000.00" }, db);

    const result = await listVariableCalcCostLinesService(user.id, db);

    expect(result).toEqual({ lines: [], totalVariable: "0.00" });
  });

  it("returns the caller's variable lines ordered by createdAt and omits fixed lines", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const envase = await addVariableCalcCostLineService(
      user.id,
      { concept: "Envase", amount: "3000.00" },
      db,
    );
    const harina = await addVariableCalcCostLineService(
      user.id,
      { concept: "Harina", amount: "20000.00" },
      db,
    );
    const esencia = await addVariableCalcCostLineService(
      user.id,
      { concept: "Esencia", amount: "15000.00" },
      db,
    );
    await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "60000.00" }, db);
    await db
      .update(calcCostLines)
      .set({ createdAt: new Date("2026-03-01T00:00:00.000Z") })
      .where(eq(calcCostLines.id, envase.id));
    await db
      .update(calcCostLines)
      .set({ createdAt: new Date("2026-01-01T00:00:00.000Z") })
      .where(eq(calcCostLines.id, harina.id));
    await db
      .update(calcCostLines)
      .set({ createdAt: new Date("2026-02-01T00:00:00.000Z") })
      .where(eq(calcCostLines.id, esencia.id));

    const result = await listVariableCalcCostLinesService(user.id, db);

    expect(result.lines.map((line) => line.concept)).toEqual(["Harina", "Esencia", "Envase"]);
    expect(result.lines.every((line) => line.behavior === "variable")).toBe(true);
  });

  it("sums the variable lines per unit when every line yields one unit", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addVariableCalcCostLineService(user.id, { concept: "Harina", amount: "20000.00" }, db);
    await addVariableCalcCostLineService(user.id, { concept: "Esencia", amount: "15000.00" }, db);
    await addVariableCalcCostLineService(user.id, { concept: "Envase", amount: "3000.00" }, db);

    const result = await listVariableCalcCostLinesService(user.id, db);

    expect(result.totalVariable).toBe("38000.00");
  });

  it("keeps the cent when the variable amounts are 0.10 and 0.20", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addVariableCalcCostLineService(user.id, { concept: "A", amount: "0.10" }, db);
    await addVariableCalcCostLineService(user.id, { concept: "B", amount: "0.20" }, db);

    const result = await listVariableCalcCostLinesService(user.id, db);

    expect(result.totalVariable).toBe("0.30");
  });

  it("divides each purchase by the units it yields", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addVariableCalcCostLineService(
      user.id,
      { concept: "Rollo", amount: "30000.00", yieldQuantity: "20" },
      db,
    );
    await addVariableCalcCostLineService(
      user.id,
      { concept: "Cinta", amount: "1.00", yieldQuantity: "3" },
      db,
    );

    const result = await listVariableCalcCostLinesService(user.id, db);

    // 30000 / 20 + 1 / 3 = 1500.333... -> 1500.33
    expect(result.totalVariable).toBe("1500.33");
  });
});

describe("addVariableCalcCostLineService", () => {
  it("throws CALC_DRAFT_MISSING when the user has no draft", async () => {
    const user = await makeUser();

    await expect(
      addVariableCalcCostLineService(user.id, { concept: "Harina", amount: "20000.00" }, db),
    ).rejects.toEqual(new AppError("CALC_DRAFT_MISSING"));
  });

  it("persists a variable line with a decimal amount and a null catalog source", async () => {
    const user = await makeUser();
    await saveDraft(user.id);

    const created = await addVariableCalcCostLineService(
      user.id,
      { concept: "Harina", amount: "20000.00" },
      db,
    );

    expect(created.behavior).toBe("variable");
    expect(created.traceability).toBe("direct");
    expect(created.sourceBusinessCostId).toBeNull();
    expect(created.amount).toBe("20000.00");
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
      addVariableCalcCostLineService(user.id, { concept: "Harina", amount: "-1" }, db),
    ).rejects.toBeInstanceOf(ZodError);

    const result = await listVariableCalcCostLinesService(user.id, db);
    expect(result.lines).toEqual([]);
  });

  it("user B cannot read or overwrite user A's variable lines", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await saveDraft(userA.id);
    await saveDraft(userB.id);
    const lineA = await addVariableCalcCostLineService(
      userA.id,
      { concept: "Harina", amount: "20000.00" },
      db,
    );

    await addVariableCalcCostLineService(
      userB.id,
      { concept: "Esencia", amount: "15000.00" },
      db,
    );

    const listA = await listVariableCalcCostLinesService(userA.id, db);
    const listB = await listVariableCalcCostLinesService(userB.id, db);
    expect(listA.lines.map((line) => line.id)).toEqual([lineA.id]);
    expect(listB.lines.map((line) => line.concept)).toEqual(["Esencia"]);

    const storedA = await db
      .select()
      .from(calcCostLines)
      .where(eq(calcCostLines.calculationId, lineA.calculationId));
    expect(storedA).toHaveLength(1);
    expect(storedA[0].concept).toBe("Harina");
  });
});

describe("updateVariableCalcCostLineAmountService", () => {
  it("throws CALC_DRAFT_MISSING when the user has no draft", async () => {
    const user = await makeUser();

    await expect(
      updateVariableCalcCostLineAmountService(user.id, UNKNOWN_LINE_ID, { amount: "1.00" }, db),
    ).rejects.toEqual(new AppError("CALC_DRAFT_MISSING"));
  });

  it("replaces the amount and keeps the concept and the axes", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const harina = await addVariableCalcCostLineService(
      user.id,
      { concept: "Harina", amount: "20000.00" },
      db,
    );
    await addVariableCalcCostLineService(user.id, { concept: "Esencia", amount: "15000.00" }, db);

    const updated = await updateVariableCalcCostLineAmountService(
      user.id,
      harina.id,
      { amount: "25000.00", concept: "Otro", behavior: "fixed" },
      db,
    );

    expect(updated).toMatchObject({
      id: harina.id,
      concept: "Harina",
      behavior: "variable",
      traceability: "direct",
      amount: "25000.00",
    });
    const listed = await listVariableCalcCostLinesService(user.id, db);
    expect(listed.lines.find((line) => line.concept === "Harina")?.amount).toBe("25000.00");
    expect(listed.lines.find((line) => line.concept === "Esencia")?.amount).toBe("15000.00");
    expect(listed.totalVariable).toBe("40000.00");
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the line is fixed", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const alquiler = await addCalcCostLineService(
      user.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );

    await expect(
      updateVariableCalcCostLineAmountService(user.id, alquiler.id, { amount: "1.00" }, db),
    ).rejects.toEqual(new AppError("CALC_COST_LINE_NOT_FOUND"));

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, alquiler.id));
    expect(stored[0].amount).toBe("60000.00");
    expect(stored[0].behavior).toBe("fixed");
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the line belongs to another user", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await saveDraft(userA.id);
    await saveDraft(userB.id);
    const lineA = await addVariableCalcCostLineService(
      userA.id,
      { concept: "Harina", amount: "20000.00" },
      db,
    );

    await expect(
      updateVariableCalcCostLineAmountService(userB.id, lineA.id, { amount: "1.00" }, db),
    ).rejects.toEqual(new AppError("CALC_COST_LINE_NOT_FOUND"));

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, lineA.id));
    expect(stored[0].amount).toBe("20000.00");
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the id does not exist", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addVariableCalcCostLineService(user.id, { concept: "Harina", amount: "20000.00" }, db);

    await expect(
      updateVariableCalcCostLineAmountService(user.id, UNKNOWN_LINE_ID, { amount: "1.00" }, db),
    ).rejects.toEqual(new AppError("CALC_COST_LINE_NOT_FOUND"));

    const listed = await listVariableCalcCostLinesService(user.id, db);
    expect(listed.lines.map((line) => line.amount)).toEqual(["20000.00"]);
  });

  it("rejects an invalid amount without changing the line", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const harina = await addVariableCalcCostLineService(
      user.id,
      { concept: "Harina", amount: "20000.00" },
      db,
    );

    await expect(
      updateVariableCalcCostLineAmountService(user.id, harina.id, { amount: "-1" }, db),
    ).rejects.toBeInstanceOf(ZodError);

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, harina.id));
    expect(stored[0].amount).toBe("20000.00");
  });
});

describe("variable line yield", () => {
  it("defaults to 1 when the add input omits it", async () => {
    const user = await makeUser();
    await saveDraft(user.id);

    const created = await addVariableCalcCostLineService(
      user.id,
      { concept: "Envase", amount: "100.00" },
      db,
    );

    expect(created.yieldQuantity).toBe("1.0000");
  });

  it("persists the yield sent with a new line", async () => {
    const user = await makeUser();
    await saveDraft(user.id);

    const created = await addVariableCalcCostLineService(
      user.id,
      { concept: "Rollo", amount: "30000.00", yieldQuantity: "20.5" },
      db,
    );

    expect(created.yieldQuantity).toBe("20.5000");
  });

  it("rejects a zero yield on a new line", async () => {
    const user = await makeUser();
    await saveDraft(user.id);

    await expect(
      addVariableCalcCostLineService(
        user.id,
        { concept: "Rollo", amount: "30000.00", yieldQuantity: "0" },
        db,
      ),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("replaces the yield and keeps the amount", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const rollo = await addVariableCalcCostLineService(
      user.id,
      { concept: "Rollo", amount: "30000.00" },
      db,
    );

    const updated = await updateVariableCalcCostLineYieldService(
      user.id,
      rollo.id,
      { yieldQuantity: "20", amount: "1.00" },
      db,
    );

    expect(updated).toMatchObject({ id: rollo.id, amount: "30000.00", yieldQuantity: "20.0000" });
    expect((await listVariableCalcCostLinesService(user.id, db)).totalVariable).toBe("1500.00");
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the line is fixed or belongs to another user", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await saveDraft(userA.id);
    await saveDraft(userB.id);
    const alquiler = await addCalcCostLineService(
      userA.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );
    const rolloB = await addVariableCalcCostLineService(
      userB.id,
      { concept: "Rollo", amount: "30000.00" },
      db,
    );
    const notFound = new AppError("CALC_COST_LINE_NOT_FOUND");

    for (const id of [alquiler.id, rolloB.id]) {
      await expect(
        updateVariableCalcCostLineYieldService(userA.id, id, { yieldQuantity: "5" }, db),
      ).rejects.toEqual(notFound);
    }

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, rolloB.id));
    expect(stored[0].yieldQuantity).toBe("1.0000");
  });

  it("rejects an invalid yield without changing the line", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const rollo = await addVariableCalcCostLineService(
      user.id,
      { concept: "Rollo", amount: "30000.00", yieldQuantity: "20" },
      db,
    );

    await expect(
      updateVariableCalcCostLineYieldService(user.id, rollo.id, { yieldQuantity: "-1" }, db),
    ).rejects.toBeInstanceOf(ZodError);

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, rollo.id));
    expect(stored[0].yieldQuantity).toBe("20.0000");
  });
});

describe("updateVariableCalcCostLineConceptService", () => {
  it("throws CALC_DRAFT_MISSING when the user has no draft", async () => {
    const user = await makeUser();

    await expect(
      updateVariableCalcCostLineConceptService(user.id, UNKNOWN_LINE_ID, { concept: "Otro" }, db),
    ).rejects.toEqual(new AppError("CALC_DRAFT_MISSING"));
  });

  it("renames the line and keeps the amount and the axes", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const harina = await addVariableCalcCostLineService(
      user.id,
      { concept: "Harina", amount: "20000.00" },
      db,
    );
    await addVariableCalcCostLineService(user.id, { concept: "Esencia", amount: "15000.00" }, db);

    const updated = await updateVariableCalcCostLineConceptService(
      user.id,
      harina.id,
      { concept: "  Harina 000  ", amount: "1.00", behavior: "fixed" },
      db,
    );

    expect(updated).toMatchObject({
      id: harina.id,
      concept: "Harina 000",
      behavior: "variable",
      traceability: "direct",
      amount: "20000.00",
    });
    const listed = await listVariableCalcCostLinesService(user.id, db);
    expect(listed.lines.map((line) => line.concept).sort()).toEqual(["Esencia", "Harina 000"]);
    expect(listed.totalVariable).toBe("35000.00");
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the line is fixed", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const alquiler = await addCalcCostLineService(
      user.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );

    await expect(
      updateVariableCalcCostLineConceptService(user.id, alquiler.id, { concept: "Otro" }, db),
    ).rejects.toEqual(new AppError("CALC_COST_LINE_NOT_FOUND"));

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, alquiler.id));
    expect(stored[0].concept).toBe("Alquiler");
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the line belongs to another user", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await saveDraft(userA.id);
    await saveDraft(userB.id);
    const lineA = await addVariableCalcCostLineService(
      userA.id,
      { concept: "Harina", amount: "20000.00" },
      db,
    );

    await expect(
      updateVariableCalcCostLineConceptService(userB.id, lineA.id, { concept: "Otro" }, db),
    ).rejects.toEqual(new AppError("CALC_COST_LINE_NOT_FOUND"));

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, lineA.id));
    expect(stored[0].concept).toBe("Harina");
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the id does not exist", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addVariableCalcCostLineService(user.id, { concept: "Harina", amount: "20000.00" }, db);

    await expect(
      updateVariableCalcCostLineConceptService(user.id, UNKNOWN_LINE_ID, { concept: "Otro" }, db),
    ).rejects.toEqual(new AppError("CALC_COST_LINE_NOT_FOUND"));

    const listed = await listVariableCalcCostLinesService(user.id, db);
    expect(listed.lines.map((line) => line.concept)).toEqual(["Harina"]);
  });

  it("rejects an empty concept without changing the line", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const harina = await addVariableCalcCostLineService(
      user.id,
      { concept: "Harina", amount: "20000.00" },
      db,
    );

    await expect(
      updateVariableCalcCostLineConceptService(user.id, harina.id, { concept: "   " }, db),
    ).rejects.toBeInstanceOf(ZodError);

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, harina.id));
    expect(stored[0].concept).toBe("Harina");
  });
});

describe("removeVariableCalcCostLineService", () => {
  it("throws CALC_DRAFT_MISSING when the user has no draft", async () => {
    const user = await makeUser();

    await expect(
      removeVariableCalcCostLineService(user.id, UNKNOWN_LINE_ID, db),
    ).rejects.toEqual(new AppError("CALC_DRAFT_MISSING"));
  });

  it("removes the line and leaves totalVariable without it", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const harina = await addVariableCalcCostLineService(
      user.id,
      { concept: "Harina", amount: "20000.00" },
      db,
    );
    await addVariableCalcCostLineService(user.id, { concept: "Esencia", amount: "15000.00" }, db);

    await removeVariableCalcCostLineService(user.id, harina.id, db);

    const listed = await listVariableCalcCostLinesService(user.id, db);
    expect(listed.lines.map((line) => line.concept)).toEqual(["Esencia"]);
    expect(listed.totalVariable).toBe("15000.00");
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the line is fixed", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const alquiler = await addCalcCostLineService(
      user.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );

    await expect(removeVariableCalcCostLineService(user.id, alquiler.id, db)).rejects.toEqual(
      new AppError("CALC_COST_LINE_NOT_FOUND"),
    );

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, alquiler.id));
    expect(stored).toHaveLength(1);
    expect(stored[0].behavior).toBe("fixed");
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the line belongs to another user", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await saveDraft(userA.id);
    await saveDraft(userB.id);
    const lineA = await addVariableCalcCostLineService(
      userA.id,
      { concept: "Harina", amount: "20000.00" },
      db,
    );

    await expect(removeVariableCalcCostLineService(userB.id, lineA.id, db)).rejects.toEqual(
      new AppError("CALC_COST_LINE_NOT_FOUND"),
    );

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, lineA.id));
    expect(stored).toHaveLength(1);
  });

  it("throws CALC_COST_LINE_NOT_FOUND when the id does not exist", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await addVariableCalcCostLineService(user.id, { concept: "Harina", amount: "20000.00" }, db);

    await expect(removeVariableCalcCostLineService(user.id, UNKNOWN_LINE_ID, db)).rejects.toEqual(
      new AppError("CALC_COST_LINE_NOT_FOUND"),
    );

    const listed = await listVariableCalcCostLinesService(user.id, db);
    expect(listed.lines).toHaveLength(1);
  });
});

describe("paso 2 isolation from paso 4 lines", () => {
  async function seedStep4Lines(userId: string) {
    const draftId = await getDraftCalculationId(userId, db);
    if (draftId === null) {
      throw new Error("draft setup did not create a draft");
    }
    const [ownLabor] = await db
      .insert(calcCostLines)
      .values({
        calculationId: draftId,
        concept: "Trabajo propio",
        amount: "200000.00",
        behavior: "fixed",
        // Direct on purpose: only the flag tells it apart from a paso 2 line.
        traceability: "direct",
        isOwnLabor: true,
      })
      .returning();
    const [indirect] = await db
      .insert(calcCostLines)
      .values({
        calculationId: draftId,
        concept: "Publicidad",
        amount: "30000.00",
        behavior: "fixed",
        traceability: "indirect",
      })
      .returning();
    return [ownLabor, indirect];
  }

  it("lists only the paso 2 lines and leaves the step 4 ones out of the fixed list", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    await seedStep4Lines(user.id);
    await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "60000.00" }, db);

    const result = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);

    expect(result.lines.map((line) => line.concept)).toEqual(["Alquiler"]);
    expect(result.totalFixed).toBe("60000.00");
  });

  it("refuses to edit, rename or remove a step 4 line from paso 2", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const step4 = await seedStep4Lines(user.id);

    for (const line of step4) {
      const notFound = new AppError("CALC_COST_LINE_NOT_FOUND");
      await expect(
        updateCalcCostLineAmountService(user.id, line.id, { amount: "1.00" }, db),
      ).rejects.toEqual(notFound);
      await expect(
        updateCalcCostLineConceptService(user.id, line.id, { concept: "Otro" }, db),
      ).rejects.toEqual(notFound);
      await expect(removeCalcCostLineService(user.id, line.id, db)).rejects.toEqual(notFound);
    }
    const stored = await db.select().from(calcCostLines);
    expect(stored.filter((row) => step4.some((line) => line.id === row.id))).toHaveLength(2);
  });
});

describe("catalog link on delete", () => {
  it("keeps the calculation line and clears sourceBusinessCostId when the catalog row is deleted", async () => {
    const user = await makeUser();
    await saveDraft(user.id);
    const created = await addCalcCostLineService(
      user.id,
      { concept: "Alquiler", amount: "60000.00" },
      db,
    );
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerUserId, user.id));
    if (!business) {
      throw new Error("draft setup did not create a business");
    }
    const [catalog] = await db
      .insert(businessCostLines)
      .values({
        businessId: business.id,
        concept: "Alquiler del taller",
        behavior: "fixed",
        traceability: "indirect",
        amountPeriod: "150000.00",
      })
      .returning();
    await db
      .update(calcCostLines)
      .set({ sourceBusinessCostId: catalog.id })
      .where(eq(calcCostLines.id, created.id));

    await db.delete(businessCostLines).where(eq(businessCostLines.id, catalog.id));

    const stored = await db.select().from(calcCostLines).where(eq(calcCostLines.id, created.id));
    expect(stored).toHaveLength(1);
    expect(stored[0].sourceBusinessCostId).toBeNull();
    expect(stored[0].concept).toBe("Alquiler");
    expect(stored[0].amount).toBe("60000.00");
  });
});

describe("calculation recency", () => {
  async function updatedAtOf(userId: string): Promise<Date> {
    const draftId = await getDraftCalculationId(userId, db);
    const [row] = await db.select().from(calculations).where(eq(calculations.id, draftId!));
    return row.updatedAt;
  }

  async function backdate(userId: string): Promise<Date> {
    const draftId = await getDraftCalculationId(userId, db);
    const old = new Date("2026-01-01T00:00:00Z");
    await db.update(calculations).set({ updatedAt: old }).where(eq(calculations.id, draftId!));
    return old;
  }

  it("moves updatedAt forward when a fixed line is added, edited or removed", async () => {
    const user = await makeUser();
    await saveDraft(user.id);

    let old = await backdate(user.id);
    const line = await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "100" }, db);
    expect((await updatedAtOf(user.id)).getTime()).toBeGreaterThan(old.getTime());

    old = await backdate(user.id);
    await updateCalcCostLineAmountService(user.id, line.id, { amount: "200" }, db);
    expect((await updatedAtOf(user.id)).getTime()).toBeGreaterThan(old.getTime());

    old = await backdate(user.id);
    await removeCalcCostLineService(user.id, line.id, db);
    expect((await updatedAtOf(user.id)).getTime()).toBeGreaterThan(old.getTime());
  });

  it("moves updatedAt forward when a variable line is added", async () => {
    const user = await makeUser();
    await saveDraft(user.id);

    const old = await backdate(user.id);
    await addVariableCalcCostLineService(user.id, { concept: "Harina", amount: "50" }, db);

    expect((await updatedAtOf(user.id)).getTime()).toBeGreaterThan(old.getTime());
  });
});
