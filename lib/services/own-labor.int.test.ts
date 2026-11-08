import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { calcCostLines } from "@/lib/db/costs/table";
import { AppError } from "@/lib/errors/app-error";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import {
  getCalculatorCostSummaryService,
  getDraftCalculationIdForUser,
  saveCalculatorSetupForUser,
} from "./calculator";
import {
  addCalcCostLineService,
  listCalcCostLinesService,
  addVariableCalcCostLineService,
} from "./cost";
import {
  addIndirectCalcCostLineService,
  getOwnLaborService,
  listIndirectCalcCostLinesService,
  removeIndirectCalcCostLineService,
  saveOwnLaborService,
  updateIndirectCalcCostLineAmountService,
  updateIndirectCalcCostLineConceptService,
} from "./own-labor";

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

async function makeDraftUser(): Promise<CreatedUser> {
  const user = await createUser();
  users.push(user);
  await saveCalculatorSetupForUser(user.id, setupInput, db);
  return user;
}

// Rows are read by draft so tests in other files cannot leak into the asserts.
async function ownLaborRows(userId: string) {
  const draftId = await getDraftCalculationIdForUser(userId, db);
  if (draftId === null) {
    throw new Error("the user has no draft");
  }
  return db
    .select()
    .from(calcCostLines)
    .where(and(eq(calcCostLines.calculationId, draftId), eq(calcCostLines.isOwnLabor, true)));
}

describe("saveOwnLaborService", () => {
  it("throws CALC_DRAFT_MISSING when the user has no draft", async () => {
    const user = await createUser();
    users.push(user);

    await expect(
      saveOwnLaborService(user.id, { hours: "10", hourlyRate: "20000" }, db),
    ).rejects.toEqual(new AppError("CALC_DRAFT_MISSING"));
  });

  it("saves hours x rate as one fixed, indirect, own-labor line", async () => {
    const user = await makeDraftUser();

    const saved = await saveOwnLaborService(user.id, { hours: "10", hourlyRate: "20000" }, db);

    expect(saved).toEqual({ hours: "10", hourlyRate: "20000", amount: "200000.00" });
    const [row] = await ownLaborRows(user.id);
    expect(row).toMatchObject({
      concept: "Trabajo propio",
      behavior: "fixed",
      traceability: "indirect",
      isOwnLabor: true,
      amount: "200000.00",
      sourceBusinessCostId: null,
      scenarioId: null,
    });
  });

  it("updates the same line on a second save", async () => {
    const user = await makeDraftUser();
    await saveOwnLaborService(user.id, { hours: "10", hourlyRate: "20000" }, db);

    const saved = await saveOwnLaborService(user.id, { hours: "80", hourlyRate: "2500" }, db);

    expect(saved.amount).toBe("200000.00");
    expect(await getOwnLaborService(user.id, db)).toEqual(saved);
    const rows = await ownLaborRows(user.id);
    expect(rows).toHaveLength(1);
  });

  it("keeps a single line when two saves race", async () => {
    const user = await makeDraftUser();

    await Promise.all([
      saveOwnLaborService(user.id, { hours: "1", hourlyRate: "100" }, db),
      saveOwnLaborService(user.id, { hours: "2", hourlyRate: "100" }, db),
    ]);

    const rows = await ownLaborRows(user.id);
    expect(rows).toHaveLength(1);
  });

  it("rounds the product HALF_UP to two decimals", async () => {
    const user = await makeDraftUser();

    const saved = await saveOwnLaborService(user.id, { hours: "1.5", hourlyRate: "0.33" }, db);

    expect(saved.amount).toBe("0.50");
  });

  it.each([
    ["only hours", { hours: "10", hourlyRate: null }, { hours: "10", hourlyRate: null }],
    ["only rate", { hours: null, hourlyRate: "2500" }, { hours: null, hourlyRate: "2500" }],
    ["both empty", { hours: null, hourlyRate: null }, { hours: null, hourlyRate: null }],
  ])("keeps the line with amount 0.00 when %s", async (_label, input, expected) => {
    const user = await makeDraftUser();

    const saved = await saveOwnLaborService(user.id, input, db);

    expect(saved).toEqual({ ...expected, amount: "0.00" });
    const rows = await ownLaborRows(user.id);
    expect(rows).toHaveLength(1);
  });

  it("rejects a negative or non-numeric value without saving", async () => {
    const user = await makeDraftUser();

    await expect(
      saveOwnLaborService(user.id, { hours: "-1", hourlyRate: "100" }, db),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      saveOwnLaborService(user.id, { hours: "10", hourlyRate: "abc" }, db),
    ).rejects.toBeInstanceOf(ZodError);
    expect(await getOwnLaborService(user.id, db)).toBeNull();
  });

  it("rejects a product that does not fit numeric(12,2) as a validation error", async () => {
    const user = await makeDraftUser();

    await expect(
      saveOwnLaborService(user.id, { hours: "9999999999", hourlyRate: "9999999999" }, db),
    ).rejects.toBeInstanceOf(ZodError);
    expect(await getOwnLaborService(user.id, db)).toBeNull();
  });

  it("counts toward the fixed total and does not appear in the paso 2 list", async () => {
    const user = await makeDraftUser();
    await saveOwnLaborService(user.id, { hours: "10", hourlyRate: "20000" }, db);

    const summary = await getCalculatorCostSummaryService(user.id, db);
    const fixed = await listCalcCostLinesService(user.id, { behavior: "fixed" }, db);

    expect(summary.totalFixed).toBe("200000.00");
    expect(fixed.lines).toEqual([]);
  });
});

describe("getOwnLaborService", () => {
  it("returns null before the first save", async () => {
    const user = await makeDraftUser();

    expect(await getOwnLaborService(user.id, db)).toBeNull();
  });

  it("does not read another user's own labor", async () => {
    const owner = await makeDraftUser();
    const other = await makeDraftUser();
    await saveOwnLaborService(owner.id, { hours: "10", hourlyRate: "20000" }, db);

    expect(await getOwnLaborService(other.id, db)).toBeNull();
  });
});

describe("indirect lines", () => {
  it("starts empty with a zero subtotal", async () => {
    const user = await makeDraftUser();

    expect(await listIndirectCalcCostLinesService(user.id, db)).toEqual({
      lines: [],
      totalIndirect: "0.00",
    });
  });

  it("adds a fixed, indirect line and sums only the indirect lines", async () => {
    const user = await makeDraftUser();
    await saveOwnLaborService(user.id, { hours: "10", hourlyRate: "20000" }, db);
    await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "60000.00" }, db);
    const added = await addIndirectCalcCostLineService(
      user.id,
      { concept: "Publicidad", amount: "30000.00" },
      db,
    );

    const listed = await listIndirectCalcCostLinesService(user.id, db);

    expect(added).toMatchObject({
      behavior: "fixed",
      traceability: "indirect",
      isOwnLabor: false,
    });
    expect(listed.lines.map((line) => line.concept)).toEqual(["Publicidad"]);
    expect(listed.totalIndirect).toBe("30000.00");
  });

  it("updates the amount and renames the line", async () => {
    const user = await makeDraftUser();
    const added = await addIndirectCalcCostLineService(
      user.id,
      { concept: "Publicidad", amount: "30000.00" },
      db,
    );

    const edited = await updateIndirectCalcCostLineAmountService(
      user.id,
      added.id,
      { amount: "35000.00" },
      db,
    );
    const renamed = await updateIndirectCalcCostLineConceptService(
      user.id,
      added.id,
      { concept: "Redes" },
      db,
    );

    expect(edited.amount).toBe("35000.00");
    expect(renamed).toMatchObject({ concept: "Redes", amount: "35000.00" });
  });

  it("rejects an empty concept when adding or renaming", async () => {
    const user = await makeDraftUser();
    const added = await addIndirectCalcCostLineService(
      user.id,
      { concept: "Publicidad", amount: "1.00" },
      db,
    );

    await expect(
      addIndirectCalcCostLineService(user.id, { concept: "  ", amount: "1.00" }, db),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      updateIndirectCalcCostLineConceptService(user.id, added.id, { concept: " " }, db),
    ).rejects.toBeInstanceOf(ZodError);
    expect((await listIndirectCalcCostLinesService(user.id, db)).lines).toHaveLength(1);
  });

  it("refuses ids of fixed-direct, variable, own-labor and foreign lines", async () => {
    const user = await makeDraftUser();
    const other = await makeDraftUser();
    await saveOwnLaborService(user.id, { hours: "10", hourlyRate: "20000" }, db);
    const [ownLabor] = await ownLaborRows(user.id);
    const fixed = await addCalcCostLineService(user.id, { concept: "Alquiler", amount: "1.00" }, db);
    const variable = await addVariableCalcCostLineService(
      user.id,
      { concept: "Envase", amount: "1.00" },
      db,
    );
    const foreign = await addIndirectCalcCostLineService(
      other.id,
      { concept: "Ajena", amount: "1.00" },
      db,
    );
    const notFound = new AppError("CALC_COST_LINE_NOT_FOUND");

    for (const id of [ownLabor.id, fixed.id, variable.id, foreign.id, "not-a-uuid"]) {
      await expect(
        updateIndirectCalcCostLineAmountService(user.id, id, { amount: "2.00" }, db),
      ).rejects.toEqual(notFound);
      await expect(
        updateIndirectCalcCostLineConceptService(user.id, id, { concept: "X" }, db),
      ).rejects.toEqual(notFound);
      await expect(removeIndirectCalcCostLineService(user.id, id, db)).rejects.toEqual(notFound);
    }
  });

  it("removes the line and drops it from the subtotal", async () => {
    const user = await makeDraftUser();
    const added = await addIndirectCalcCostLineService(
      user.id,
      { concept: "Publicidad", amount: "30000.00" },
      db,
    );

    await removeIndirectCalcCostLineService(user.id, added.id, db);

    expect(await listIndirectCalcCostLinesService(user.id, db)).toEqual({
      lines: [],
      totalIndirect: "0.00",
    });
  });
});
