import "server-only";

import Decimal from "decimal.js";
import { and, asc, eq } from "drizzle-orm";

import { calculateCostTotals, type CostLine } from "@/lib/calc/calculateCostTotals";
import { calculations } from "@/lib/db/calculation/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { calcCostLines, type CalcCostLine } from "@/lib/db/costs/table";
import { uuidString } from "@/lib/db/formats";
import {
  addCalcCostLineInputSchema,
  addVariableCalcCostLineInputSchema,
  listCalcCostLinesOptionsSchema,
  updateCalcCostLineAmountInputSchema,
  updateCalcCostLineConceptInputSchema,
  updateCalcCostLineYieldInputSchema,
  type ListCalcCostLinesOptions,
} from "@/lib/db/costs/validation";
import { AppError } from "@/lib/errors/app-error";

import { getDraftCalculationId } from "./calculator";
import type { Tx } from "./calculations";

// Fixed-cost lines of the calculator draft (paso 2, #176).
// The client sends concept and amount. behavior, traceability and the catalog
// link are server-owned: every line added here is a fixed, direct cost with
// no business_cost_lines row. Listing never trusts an id from the client;
// the draft is resolved from userId.

const MONEY_DECIMALS = 2;

export type CalcCostLineList = {
  lines: CalcCostLine[];
  totalFixed: string;
};

// Decimal keeps the cent: 0.10 + 0.20 is 0.30.
export function sumMoney(amounts: string[]): string {
  const total = amounts.reduce((sum, amount) => sum.plus(amount), new Decimal(0));
  return total.toFixed(MONEY_DECIMALS);
}

export async function requireDraftId(userId: string, db: Db): Promise<string> {
  const draftId = await getDraftCalculationId(userId, db);
  if (draftId === null) {
    throw new AppError("CALC_DRAFT_MISSING");
  }
  return draftId;
}

// The dashboard orders and dates calculations by calculations.updated_at, which
// a cost-line write would not move on its own: touch it so an edited
// calculation shows as recently updated.
async function touchCalculation(db: Db | Tx, calculationId: string): Promise<void> {
  await db
    .update(calculations)
    .set({ updatedAt: new Date() })
    .where(eq(calculations.id, calculationId));
}

// A line id comes from the client. An id that is not a uuid, that does not
// exist, or that sits on another user's draft all surface as the same code.
// Postgres would otherwise reject a non-uuid with a type error and the door
// would turn that into a 500.
export function requireLineId(lineId: string): string {
  const parsed = uuidString.safeParse(lineId);
  if (!parsed.success) {
    throw new AppError("CALC_COST_LINE_NOT_FOUND");
  }
  return parsed.data;
}

// Paso 2 owns only the fixed, direct lines that are not own labor. The own
// labor and the indirect lines of paso 4 are also fixed but live in their own
// step (lib/services/own-labor.ts), so paso 2 can neither list nor touch them.
function fixedLineOfDraft(lineId: string, draftId: string) {
  return and(
    eq(calcCostLines.id, lineId),
    eq(calcCostLines.calculationId, draftId),
    eq(calcCostLines.behavior, "fixed"),
    eq(calcCostLines.traceability, "direct"),
    eq(calcCostLines.isOwnLabor, false),
  );
}

export async function listCalcCostLinesService(
  userId: string,
  opts: ListCalcCostLinesOptions = {},
  db: Db = getDrizzleClient(),
): Promise<CalcCostLineList> {
  const options = listCalcCostLinesOptionsSchema.parse(opts);
  const draftId = await requireDraftId(userId, db);

  const filters = [eq(calcCostLines.calculationId, draftId)];
  if (options.behavior !== undefined) {
    filters.push(eq(calcCostLines.behavior, options.behavior));
    if (options.behavior === "fixed") {
      filters.push(
        eq(calcCostLines.traceability, "direct"),
        eq(calcCostLines.isOwnLabor, false),
      );
    }
  }

  // createdAt is the order the paso 2 list shows. id only breaks a tie, so
  // two lines saved in the same instant do not swap between reloads.
  const lines = await db
    .select()
    .from(calcCostLines)
    .where(and(...filters))
    .orderBy(asc(calcCostLines.createdAt), asc(calcCostLines.id));

  // totalFixed is the fixed-cost subtotal. An unfiltered list still returns
  // every line, but the total ignores variable ones so a caller that forgets
  // the filter cannot inflate the paso 2 price. A caller that already asked
  // for a behavior gets that subset's plain sum under the same field; paso 3
  // does not use it, because a variable amount is per purchase, not a total.
  const amounts =
    options.behavior === undefined
      ? lines.filter((line) => line.behavior === "fixed").map((line) => line.amount)
      : lines.map((line) => line.amount);

  return {
    lines,
    totalFixed: sumMoney(amounts),
  };
}

export async function addCalcCostLineService(
  userId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<CalcCostLine> {
  const line = addCalcCostLineInputSchema.parse(input);
  const draftId = await requireDraftId(userId, db);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(calcCostLines)
      .values({
        calculationId: draftId,
        concept: line.concept,
        amount: line.amount,
        behavior: "fixed",
        traceability: "direct",
        sourceBusinessCostId: null,
      })
      .returning();

    await touchCalculation(tx, draftId);
    return created;
  });
}

export async function updateCalcCostLineAmountService(
  userId: string,
  lineId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<CalcCostLine> {
  const { amount } = updateCalcCostLineAmountInputSchema.parse(input);
  const id = requireLineId(lineId);
  const draftId = await requireDraftId(userId, db);

  const [updated] = await db
    .update(calcCostLines)
    .set({ amount })
    .where(fixedLineOfDraft(id, draftId))
    .returning();

  if (!updated) {
    throw new AppError("CALC_COST_LINE_NOT_FOUND");
  }

  await touchCalculation(db, draftId);
  return updated;
}

// The rename services differ only in which lines they match.
export async function renameCalcCostLine(
  userId: string,
  lineId: string,
  input: unknown,
  db: Db,
  lineOfDraft: typeof fixedLineOfDraft,
): Promise<CalcCostLine> {
  const { concept } = updateCalcCostLineConceptInputSchema.parse(input);
  const id = requireLineId(lineId);
  const draftId = await requireDraftId(userId, db);

  const [updated] = await db
    .update(calcCostLines)
    .set({ concept })
    .where(lineOfDraft(id, draftId))
    .returning();

  if (!updated) {
    throw new AppError("CALC_COST_LINE_NOT_FOUND");
  }

  await touchCalculation(db, draftId);
  return updated;
}

export async function updateCalcCostLineConceptService(
  userId: string,
  lineId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<CalcCostLine> {
  return renameCalcCostLine(userId, lineId, input, db, fixedLineOfDraft);
}

export async function removeCalcCostLineService(
  userId: string,
  lineId: string,
  db: Db = getDrizzleClient(),
): Promise<CalcCostLine> {
  const id = requireLineId(lineId);
  const draftId = await requireDraftId(userId, db);

  const [removed] = await db
    .delete(calcCostLines)
    .where(fixedLineOfDraft(id, draftId))
    .returning();

  if (!removed) {
    throw new AppError("CALC_COST_LINE_NOT_FOUND");
  }

  await touchCalculation(db, draftId);
  return removed;
}

// Variable-cost lines of the calculator draft (paso 3, #198).
// The public input is { concept, amount, yieldQuantity }: what one purchase
// costs and how many product units it yields. These functions write and match
// behavior "variable", so a fixed line cannot be corrected or removed from
// this step. totalVariable is the variable cost per product unit,
// Σ amount / yield, computed by the engine.

export type VariableCalcCostLineList = {
  lines: CalcCostLine[];
  totalVariable: string;
};

function variableLineOfDraft(lineId: string, draftId: string) {
  return and(
    eq(calcCostLines.id, lineId),
    eq(calcCostLines.calculationId, draftId),
    eq(calcCostLines.behavior, "variable"),
  );
}

export async function listVariableCalcCostLinesService(
  userId: string,
  db: Db = getDrizzleClient(),
): Promise<VariableCalcCostLineList> {
  const { lines } = await listCalcCostLinesService(userId, { behavior: "variable" }, db);

  // The per-unit variable cost does not depend on the volume, so the engine
  // runs with volume 1 and only variableUnitario is read: the formula stays
  // in lib/calc.
  const totals = calculateCostTotals({
    volume: 1,
    lines: lines.map((line) => ({
      id: line.id,
      // Plain text columns: the engine validates them at runtime.
      behavior: line.behavior as CostLine["behavior"],
      traceability: line.traceability as CostLine["traceability"],
      isOwnLabor: line.isOwnLabor,
      amount: line.amount,
      yieldQuantity: line.yieldQuantity,
    })),
  });

  if (!totals.ok) {
    throw new AppError("CALC_COST_SUMMARY_FAILED", undefined, { cause: totals });
  }

  return { lines, totalVariable: totals.variableUnitario };
}

export async function addVariableCalcCostLineService(
  userId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<CalcCostLine> {
  const line = addVariableCalcCostLineInputSchema.parse(input);
  const draftId = await requireDraftId(userId, db);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(calcCostLines)
      .values({
        calculationId: draftId,
        concept: line.concept,
        amount: line.amount,
        // undefined leaves the column default, 1.
        yieldQuantity: line.yieldQuantity,
        behavior: "variable",
        traceability: "direct",
        sourceBusinessCostId: null,
      })
      .returning();

    await touchCalculation(tx, draftId);
    return created;
  });
}

export async function updateVariableCalcCostLineAmountService(
  userId: string,
  lineId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<CalcCostLine> {
  const { amount } = updateCalcCostLineAmountInputSchema.parse(input);
  const id = requireLineId(lineId);
  const draftId = await requireDraftId(userId, db);

  const [updated] = await db
    .update(calcCostLines)
    .set({ amount })
    .where(variableLineOfDraft(id, draftId))
    .returning();

  if (!updated) {
    throw new AppError("CALC_COST_LINE_NOT_FOUND");
  }

  await touchCalculation(db, draftId);
  return updated;
}

export async function updateVariableCalcCostLineYieldService(
  userId: string,
  lineId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<CalcCostLine> {
  const { yieldQuantity } = updateCalcCostLineYieldInputSchema.parse(input);
  const id = requireLineId(lineId);
  const draftId = await requireDraftId(userId, db);

  const [updated] = await db
    .update(calcCostLines)
    .set({ yieldQuantity })
    .where(variableLineOfDraft(id, draftId))
    .returning();

  if (!updated) {
    throw new AppError("CALC_COST_LINE_NOT_FOUND");
  }

  await touchCalculation(db, draftId);
  return updated;
}

export async function updateVariableCalcCostLineConceptService(
  userId: string,
  lineId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<CalcCostLine> {
  return renameCalcCostLine(userId, lineId, input, db, variableLineOfDraft);
}

export async function removeVariableCalcCostLineService(
  userId: string,
  lineId: string,
  db: Db = getDrizzleClient(),
): Promise<CalcCostLine> {
  const id = requireLineId(lineId);
  const draftId = await requireDraftId(userId, db);

  const [removed] = await db
    .delete(calcCostLines)
    .where(variableLineOfDraft(id, draftId))
    .returning();

  if (!removed) {
    throw new AppError("CALC_COST_LINE_NOT_FOUND");
  }

  await touchCalculation(db, draftId);
  return removed;
}
