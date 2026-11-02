import "server-only";

import Decimal from "decimal.js";
import { and, eq, sql } from "drizzle-orm";

import { calculateCostTotals, type CostLine } from "@/lib/calc/calculateCostTotals";
import { products } from "@/lib/db/business/table";
import { calculations, costingSetup } from "@/lib/db/calculation/table";
import {
  saveCalculatorSetupInputSchema,
  type SaveCalculatorSetupInput,
} from "@/lib/db/calculation/validation";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { calcCostLines } from "@/lib/db/costs/table";
import { AppError } from "@/lib/errors/app-error";
import type {
  CalculatorCostSummary,
  CalculatorDraftSetup,
} from "@/lib/types/calculator";

import { getOrCreateDefaultBusiness, resolveActiveCalculation } from "./calculations";

// Calculator setup persistence (ADR 0005: the draft lives server-side only).
// Input is validated with the server gate from lib/db (saveCalculatorSetupInputSchema),
// never with the client form contract.
// Owner scoping: every query and write filters by the caller's userId.
// The service throws (ZodError, AppError); doors translate. No try/catch.

// Wizard progress: the setup is step 1, and saving it unlocks step 2.
const SETUP_STEP = 1;
const LAST_STEP = 7;

// The calculation the wizard targets (see resolveActiveCalculation).
export async function getDraftCalculationId(
  userId: string,
  db: Db,
): Promise<string | null> {
  return (await resolveActiveCalculation(userId, db))?.id ?? null;
}

export async function saveCalculatorSetupService(
  userId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<SaveCalculatorSetupInput> {
  const setup = saveCalculatorSetupInputSchema.parse(input);

  return db.transaction(async (tx) => {
    const business = await getOrCreateDefaultBusiness(tx, userId);

    const draft = await resolveActiveCalculation(userId, tx);

    let calculationId: string;

    if (draft) {
      await tx
        .update(products)
        .set({ name: setup.name })
        .where(and(eq(products.id, draft.productId), eq(products.businessId, business.id)));
      // Editing an earlier step again never lowers the progress already made.
      await tx
        .update(calculations)
        .set({
          currentStep: sql`least(${LAST_STEP}, greatest(${calculations.currentStep}, ${SETUP_STEP + 1}))`,
        })
        .where(and(eq(calculations.id, draft.id), eq(calculations.userId, userId)));
      calculationId = draft.id;
    } else {
      const [product] = await tx
        .insert(products)
        .values({ name: setup.name, businessId: business.id })
        .returning();
      const [calculation] = await tx
        .insert(calculations)
        .values({
          userId,
          businessId: business.id,
          productId: product.id,
          currentStep: SETUP_STEP + 1,
        })
        .returning();
      calculationId = calculation.id;
    }

    await tx
      .insert(costingSetup)
      .values({
        calculationId,
        unit: setup.unit,
        volume: setup.volume,
        currency: setup.currency,
        period: setup.period,
      })
      .onConflictDoUpdate({
        target: costingSetup.calculationId,
        set: {
          unit: setup.unit,
          volume: setup.volume,
          currency: setup.currency,
          period: setup.period,
          updatedAt: new Date(),
        },
      });

    return setup;
  });
}

/**
 * Read model for the step 1 form: the draft the user is editing and its
 * persisted setup. It never writes.
 *
 * Null semantics:
 * - no draft: `calculationId` and `setup` are null.
 * - draft without a `costing_setup` row: `calculationId` is returned so the
 *   form can still save to that draft, and `setup` is null.
 * - draft with setup: both values are returned.
 */
export async function getCalculatorDraftSetupService(
  userId: string,
  db: Db = getDrizzleClient(),
): Promise<CalculatorDraftSetup> {
  const active = await resolveActiveCalculation(userId, db);
  if (!active) {
    return { calculationId: null, setup: null };
  }

  const [draft] = await db
    .select({
      calculationId: calculations.id,
      name: products.name,
      unit: costingSetup.unit,
      volume: costingSetup.volume,
      currency: costingSetup.currency,
      period: costingSetup.period,
    })
    .from(calculations)
    .innerJoin(products, eq(calculations.productId, products.id))
    .leftJoin(costingSetup, eq(costingSetup.calculationId, calculations.id))
    .where(and(eq(calculations.id, active.id), eq(calculations.userId, userId)))
    .limit(1);

  if (!draft) {
    return { calculationId: null, setup: null };
  }

  if (
    draft.unit === null ||
    draft.volume === null ||
    draft.currency === null ||
    draft.period === null
  ) {
    return { calculationId: draft.calculationId, setup: null };
  }

  return {
    calculationId: draft.calculationId,
    setup: saveCalculatorSetupInputSchema.parse({
      name: draft.name,
      unit: draft.unit,
      volume: draft.volume,
      currency: draft.currency,
      period: draft.period,
    }),
  };
}

function emptyCostSummary(
  calculationId: string | null,
  volume: number | null = null,
): CalculatorCostSummary {
  return {
    calculationId,
    totalFixed: null,
    variableUnit: null,
    unitCost: null,
    volume,
    currency: "ARS",
  };
}

/**
 * Read model for the step 1 "live unit cost" card (#172): totals for the
 * user's draft, computed on the fly with the pure engine. It never writes
 * `computed_results` or `calc_cost_lines`.
 *
 * Null semantics:
 * - no draft: `calculationId`, the amounts and `volume` are null.
 * - draft without `costing_setup`: `calculationId` is returned; everything
 *   else is null because there is no volume to divide by.
 * - draft with setup and no cost lines: `calculationId` and `volume` are
 *   returned; the amounts stay null because there are no costs yet.
 * - draft with setup and cost lines: the three amounts are decimal strings,
 *   and a category with no lines is "0.00", not null.
 *
 * `unitCost` is the engine's `unitarioPorDocena` (totalPeriodo / volume); the
 * divisor is already the setup volume, so it is exposed as-is, without
 * multiplying or dividing by 12. `variableUnit` is the one division the engine
 * does not expose: subtotalVariable / volume, rounded like the engine.
 *
 * @throws AppError CALC_COST_SUMMARY_FAILED when the engine rejects the
 * persisted lines (invalid behavior, traceability, amount or volume).
 */
export async function getCalculatorCostSummaryService(
  userId: string,
  db: Db = getDrizzleClient(),
): Promise<CalculatorCostSummary> {
  const calculationId = await getDraftCalculationId(userId, db);

  if (!calculationId) {
    return emptyCostSummary(null);
  }

  const [setup] = await db
    .select({ volume: costingSetup.volume })
    .from(costingSetup)
    .where(eq(costingSetup.calculationId, calculationId))
    .limit(1);

  if (!setup) {
    return emptyCostSummary(calculationId);
  }

  const rows = await db
    .select({
      id: calcCostLines.id,
      behavior: calcCostLines.behavior,
      traceability: calcCostLines.traceability,
      amount: calcCostLines.amount,
    })
    .from(calcCostLines)
    .where(eq(calcCostLines.calculationId, calculationId));

  if (rows.length === 0) {
    return emptyCostSummary(calculationId, setup.volume);
  }

  // #91 adds `is_own_labor` to calc_cost_lines. Until it lands, every line is
  // "not own labor": that cross-cut never changes totalFixed, variableUnit or
  // unitCost, because own labor already enters the total through its behavior.
  const lines: CostLine[] = rows.map((row) => ({
    id: row.id,
    // The columns are plain text; the engine validates them at runtime and
    // rejects unknown values, so the cast only bridges the static type.
    behavior: row.behavior as CostLine["behavior"],
    traceability: row.traceability as CostLine["traceability"],
    isOwnLabor: false,
    amount: row.amount,
  }));

  const totals = calculateCostTotals({ lines, volume: setup.volume });

  if (!totals.ok) {
    throw new AppError("CALC_COST_SUMMARY_FAILED", undefined, { cause: totals });
  }

  // The engine does not expose variable/volume: make that single division
  // here, with the same rounding as the engine (2 decimals, HALF_UP). Do not
  // recompute subtotals or totals.
  const variableUnit = new Decimal(totals.subtotalVariable)
    .div(totals.volume)
    .toFixed(2, Decimal.ROUND_HALF_UP);

  return {
    calculationId,
    totalFixed: totals.subtotalFijo,
    variableUnit,
    unitCost: totals.unitarioPorDocena,
    volume: totals.volume,
    currency: "ARS",
  };
}

export type CalculatorProgress = {
  // Furthest wizard step the user may open (1..7).
  currentStep: number;
};

/**
 * Read model for the wizard chrome and the step guards. A user without a draft
 * has only step 1 available. It never writes.
 */
export async function getCalculatorProgressService(
  userId: string,
  db: Db = getDrizzleClient(),
): Promise<CalculatorProgress> {
  const active = await resolveActiveCalculation(userId, db);

  return { currentStep: active?.currentStep ?? 1 };
}
