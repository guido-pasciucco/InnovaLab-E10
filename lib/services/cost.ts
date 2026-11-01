import "server-only";

import Decimal from "decimal.js";
import { and, asc, eq } from "drizzle-orm";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { calcCostLines, type CalcCostLine } from "@/lib/db/costs/table";
import { uuidString } from "@/lib/db/formats";
import {
  addCalcCostLineInputSchema,
  listCalcCostLinesOptionsSchema,
  updateCalcCostLineAmountInputSchema,
  type ListCalcCostLinesOptions,
} from "@/lib/db/costs/validation";
import { AppError } from "@/lib/errors/app-error";

import { getDraftCalculationId } from "./calculator";

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

// Sum the amounts the query already returned. The behavior filter, when
// present, decides which lines are in that set; this function does not
// apply a second one. Decimal keeps the cent: 0.10 + 0.20 is 0.30.
function sumMoney(amounts: string[]): string {
  const total = amounts.reduce((sum, amount) => sum.plus(amount), new Decimal(0));
  return total.toFixed(MONEY_DECIMALS);
}

async function requireDraftId(userId: string, db: Db): Promise<string> {
  const draftId = await getDraftCalculationId(userId, db);
  if (draftId === null) {
    throw new AppError("CALC_DRAFT_MISSING");
  }
  return draftId;
}

// A line id comes from the client. An id that is not a uuid, that does not
// exist, or that sits on another user's draft all surface as the same code.
// Postgres would otherwise reject a non-uuid with a type error and the door
// would turn that into a 500.
function requireLineId(lineId: string): string {
  const parsed = uuidString.safeParse(lineId);
  if (!parsed.success) {
    throw new AppError("CALC_COST_LINE_NOT_FOUND");
  }
  return parsed.data;
}

function fixedLineOfDraft(lineId: string, draftId: string) {
  return and(
    eq(calcCostLines.id, lineId),
    eq(calcCostLines.calculationId, draftId),
    eq(calcCostLines.behavior, "fixed"),
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
  }

  // createdAt is the order the paso 2 list shows. id only breaks a tie, so
  // two lines saved in the same instant do not swap between reloads.
  const lines = await db
    .select()
    .from(calcCostLines)
    .where(and(...filters))
    .orderBy(asc(calcCostLines.createdAt), asc(calcCostLines.id));

  return {
    lines,
    totalFixed: sumMoney(lines.map((line) => line.amount)),
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

  return updated;
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

  return removed;
}

// Variable-cost lines of the calculator draft (paso 3, #198).
// The public input is the same { concept, amount }. These functions write and
// match behavior "variable", so a fixed line cannot be corrected or removed
// from this step. totalVariable sums the loaded amounts, the same role as
// totalFixed; it is not a per-unit cost.

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
  // listCalcCostLinesService names every filtered sum totalFixed. This step
  // publishes that sum as totalVariable.
  const listed = await listCalcCostLinesService(userId, { behavior: "variable" }, db);

  return {
    lines: listed.lines,
    totalVariable: listed.totalFixed,
  };
}

export async function addVariableCalcCostLineService(
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
        behavior: "variable",
        traceability: "direct",
        sourceBusinessCostId: null,
      })
      .returning();

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

  return updated;
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

  return removed;
}
