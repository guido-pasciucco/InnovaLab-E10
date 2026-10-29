import "server-only";

import Decimal from "decimal.js";
import { and, asc, eq } from "drizzle-orm";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { calcCostLines, type CalcCostLine } from "@/lib/db/costs/table";
import {
  addCalcCostLineInputSchema,
  listCalcCostLinesOptionsSchema,
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
