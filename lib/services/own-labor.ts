import "server-only";
import type { VerifiedUserId } from "./auth";

import Decimal from "decimal.js";
import { and, asc, eq, sql } from "drizzle-orm";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { calcCostLines, type CalcCostLine } from "@/lib/db/costs/table";
import {
  addCalcCostLineInputSchema,
  saveOwnLaborInputSchema,
  updateCalcCostLineAmountInputSchema,
} from "@/lib/db/costs/validation";
import { AppError } from "@/lib/errors/app-error";
import { amountField } from "@/lib/schemas/costs/fields";

import {
  renameCalcCostLine,
  requireDraftId,
  requireLineId,
  sumMoney,
} from "./cost";

// Own labor and indirect costs of the calculator draft (paso 4).
// Own labor is one line per draft: hours of the month x hourly rate. The
// partial unique index calc_cost_lines_own_labor_uq (is_own_labor) keeps it
// single, and the save is an atomic upsert on that index. Both own labor and
// the indirect lines are fixed, indirect costs; lib/services/cost.ts leaves
// them out of paso 2, and they still count in the fixed total.

const MONEY_DECIMALS = 2;
const OWN_LABOR_CONCEPT = "Trabajo propio";

export type OwnLabor = {
  hours: string | null;
  hourlyRate: string | null;
  amount: string;
};

export type IndirectCalcCostLineList = {
  lines: CalcCostLine[];
  totalIndirect: string;
};

// Normalized so the inputs show what the user typed ("10.0000" is "10").
function toOwnLabor(line: CalcCostLine): OwnLabor {
  return {
    hours: line.hours === null ? null : new Decimal(line.hours).toString(),
    hourlyRate: line.hourlyRate === null ? null : new Decimal(line.hourlyRate).toString(),
    amount: line.amount,
  };
}

export async function getOwnLaborService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<OwnLabor | null> {
  const draftId = await requireDraftId(userId, db);

  const [line] = await db
    .select()
    .from(calcCostLines)
    .where(and(eq(calcCostLines.calculationId, draftId), eq(calcCostLines.isOwnLabor, true)));

  return line ? toOwnLabor(line) : null;
}

export async function saveOwnLaborService(
  userId: VerifiedUserId,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<OwnLabor> {
  const { hours, hourlyRate } = saveOwnLaborInputSchema.parse(input);
  const draftId = await requireDraftId(userId, db);

  // The product is computed only when both values are there. A partial or an
  // empty pair keeps the line with amount 0, so the user never loses it.
  // Parsing the product re-checks it against numeric(12,2): two valid 10-digit
  // values can still overflow, and that must be a field error, not a 500.
  const amount =
    hours !== null && hourlyRate !== null
      ? amountField.parse(
          new Decimal(hours)
            .times(hourlyRate)
            .toFixed(MONEY_DECIMALS, Decimal.ROUND_HALF_UP),
        )
      : new Decimal(0).toFixed(MONEY_DECIMALS);

  const [saved] = await db
    .insert(calcCostLines)
    .values({
      calculationId: draftId,
      concept: OWN_LABOR_CONCEPT,
      amount,
      behavior: "fixed",
      traceability: "indirect",
      isOwnLabor: true,
      hours,
      hourlyRate,
      sourceBusinessCostId: null,
      scenarioId: null,
    })
    .onConflictDoUpdate({
      target: calcCostLines.calculationId,
      targetWhere: sql`is_own_labor = true`,
      set: { amount, hours, hourlyRate },
    })
    .returning();

  return toOwnLabor(saved);
}

// Indirect concepts typed by the user: fixed, indirect and not own labor.
function indirectLineOfDraft(lineId: string, draftId: string) {
  return and(
    eq(calcCostLines.id, lineId),
    eq(calcCostLines.calculationId, draftId),
    eq(calcCostLines.behavior, "fixed"),
    eq(calcCostLines.traceability, "indirect"),
    eq(calcCostLines.isOwnLabor, false),
  );
}

export async function listIndirectCalcCostLinesService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<IndirectCalcCostLineList> {
  const draftId = await requireDraftId(userId, db);

  const lines = await db
    .select()
    .from(calcCostLines)
    .where(
      and(
        eq(calcCostLines.calculationId, draftId),
        eq(calcCostLines.behavior, "fixed"),
        eq(calcCostLines.traceability, "indirect"),
        eq(calcCostLines.isOwnLabor, false),
      ),
    )
    .orderBy(asc(calcCostLines.createdAt), asc(calcCostLines.id));

  return { lines, totalIndirect: sumMoney(lines.map((line) => line.amount)) };
}

export async function addIndirectCalcCostLineService(
  userId: VerifiedUserId,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<CalcCostLine> {
  const line = addCalcCostLineInputSchema.parse(input);
  const draftId = await requireDraftId(userId, db);

  const [created] = await db
    .insert(calcCostLines)
    .values({
      calculationId: draftId,
      concept: line.concept,
      amount: line.amount,
      behavior: "fixed",
      traceability: "indirect",
      isOwnLabor: false,
      sourceBusinessCostId: null,
    })
    .returning();

  return created;
}

export async function updateIndirectCalcCostLineAmountService(
  userId: VerifiedUserId,
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
    .where(indirectLineOfDraft(id, draftId))
    .returning();

  if (!updated) {
    throw new AppError("CALC_COST_LINE_NOT_FOUND");
  }

  return updated;
}

export async function updateIndirectCalcCostLineConceptService(
  userId: VerifiedUserId,
  lineId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<CalcCostLine> {
  return renameCalcCostLine(userId, lineId, input, db, indirectLineOfDraft);
}

export async function removeIndirectCalcCostLineService(
  userId: VerifiedUserId,
  lineId: string,
  db: Db = getDrizzleClient(),
): Promise<CalcCostLine> {
  const id = requireLineId(lineId);
  const draftId = await requireDraftId(userId, db);

  const [removed] = await db
    .delete(calcCostLines)
    .where(indirectLineOfDraft(id, draftId))
    .returning();

  if (!removed) {
    throw new AppError("CALC_COST_LINE_NOT_FOUND");
  }

  return removed;
}
