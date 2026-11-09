import "server-only";
import type { VerifiedUserId } from "./auth";

import Decimal from "decimal.js";
import { and, asc, count, desc, eq } from "drizzle-orm";

import { compareScenarios, MAX_SCENARIOS } from "@/lib/calc/compareScenarios";
import { calculations, scenarios } from "@/lib/db/calculation/table";
import { updateScenarioInputSchema } from "@/lib/db/calculation/validation";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { uuidString } from "@/lib/db/formats";
import { AppError } from "@/lib/errors/app-error";
import type {
  CalculatorScenario,
  ScenarioComparisonInputs,
  ScenarioComparisonView,
} from "@/lib/types/calculator";

import type { Tx } from "./calculations";
import { getCalculatorCostSummaryService, getDraftCalculationId } from "./calculator";
import { getCalculatorPricingInputsService } from "./pricing";

// Step 7 persistence: the scenarios of the user's draft. The base is the
// calculation as entered in steps 1-6 and is never edited here; alternatives
// store nullable price and volume overrides. Owner scoping comes from
// getDraftCalculationId, which only resolves the caller's own draft, and every
// scenario query also filters by that draft.
// The service throws (ZodError, AppError); doors translate. No try/catch.

const BASE_NAME = "Base";
const COPY_SUFFIX = " (copia)";
// scenarioNameField caps names at 120 characters; the copy keeps within it.
const MAX_NAME_LENGTH = 120;

const scenarioColumns = {
  id: scenarios.id,
  name: scenarios.name,
  isBase: scenarios.isBase,
  priceOverride: scenarios.priceOverride,
  volumeOverride: scenarios.volumeOverride,
};

type ScenarioRow = {
  id: string;
  name: string;
  isBase: boolean;
  priceOverride: string | null;
  volumeOverride: number | null;
};

function toScenario(row: ScenarioRow): CalculatorScenario {
  return {
    ...row,
    // numeric(12,2) comes back as "5000.00": show it as the user typed it.
    priceOverride: row.priceOverride === null ? null : new Decimal(row.priceOverride).toString(),
  };
}

async function requireDraftId(userId: VerifiedUserId, db: Db): Promise<string> {
  const draftId = await getDraftCalculationId(userId, db);
  if (draftId === null) {
    throw new AppError("CALC_DRAFT_MISSING");
  }
  return draftId;
}

// A scenario id comes from the client. An id that is not a uuid, that does
// not exist, or that sits on another user's draft all surface as the same
// code; Postgres would otherwise reject a non-uuid with a 500.
function requireScenarioId(scenarioId: unknown): string {
  const parsed = uuidString.safeParse(scenarioId);
  if (!parsed.success) {
    throw new AppError("CALC_SCENARIO_NOT_FOUND");
  }
  return parsed.data;
}

async function findScenarioOfDraft(
  db: Db | Tx,
  scenarioId: string,
  draftId: string,
): Promise<ScenarioRow> {
  const [row] = await db
    .select(scenarioColumns)
    .from(scenarios)
    .where(and(eq(scenarios.id, scenarioId), eq(scenarios.calculationId, draftId)))
    .limit(1);

  if (!row) {
    throw new AppError("CALC_SCENARIO_NOT_FOUND");
  }
  return row;
}

// The dashboard orders calculations by updated_at, which a scenario write
// would not move on its own.
async function touchCalculation(db: Db | Tx, calculationId: string): Promise<void> {
  await db
    .update(calculations)
    .set({ updatedAt: new Date() })
    .where(eq(calculations.id, calculationId));
}

async function listScenarios(db: Db, draftId: string): Promise<CalculatorScenario[]> {
  const rows = await db
    .select(scenarioColumns)
    .from(scenarios)
    .where(eq(scenarios.calculationId, draftId))
    .orderBy(desc(scenarios.isBase), asc(scenarios.createdAt), asc(scenarios.id));

  return rows.map(toScenario);
}

/**
 * Read model for step 7: the draft's scenarios, base first, and their
 * comparison computed with the pure engine from the persisted costs and
 * margin. The first visit creates the base scenario ("Base", no overrides);
 * a unique index makes that insert safe when two tabs open the step at once.
 *
 * @throws AppError CALC_COST_SUMMARY_FAILED when the engine rejects the
 * persisted cost lines (see getCalculatorCostSummaryService).
 */
export async function getScenarioComparisonService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<ScenarioComparisonView> {
  const draftId = await getDraftCalculationId(userId, db);
  if (draftId === null) {
    return { calculationId: null, scenarios: [], inputs: null, comparison: null };
  }

  await db
    .insert(scenarios)
    .values({ calculationId: draftId, name: BASE_NAME, isBase: true })
    .onConflictDoNothing();

  const [list, costs, pricing] = await Promise.all([
    listScenarios(db, draftId),
    getCalculatorCostSummaryService(userId, db),
    getCalculatorPricingInputsService(userId, db),
  ]);

  if (
    costs.totalFixed === null ||
    costs.variableUnit === null ||
    costs.unitCost === null ||
    costs.volume === null ||
    pricing.expectedMarginPct === null
  ) {
    return { calculationId: draftId, scenarios: list, inputs: null, comparison: null };
  }

  const inputs: ScenarioComparisonInputs = {
    totalFixed: costs.totalFixed,
    variableUnit: costs.variableUnit,
    unitCost: costs.unitCost,
    volume: costs.volume,
    marginPct: pricing.expectedMarginPct,
  };

  return {
    calculationId: draftId,
    scenarios: list,
    inputs,
    comparison: compareScenarios(inputs, list),
  };
}

/**
 * Copies a scenario of the draft as a new alternative named "<name> (copia)",
 * with the same overrides. Duplicating the base gives an alternative without
 * overrides. The calculation row is locked while counting, so two tabs cannot
 * go past the limit.
 *
 * @throws AppError CALC_DRAFT_MISSING when the user has no draft.
 * @throws AppError CALC_SCENARIO_NOT_FOUND for a missing or foreign scenario.
 * @throws AppError CALC_SCENARIO_LIMIT_REACHED when the draft already has
 * MAX_SCENARIOS scenarios.
 */
export async function duplicateScenarioService(
  userId: VerifiedUserId,
  scenarioId: unknown,
  db: Db = getDrizzleClient(),
): Promise<CalculatorScenario> {
  const id = requireScenarioId(scenarioId);
  const draftId = await requireDraftId(userId, db);

  return db.transaction(async (tx) => {
    await tx
      .select({ id: calculations.id })
      .from(calculations)
      .where(and(eq(calculations.id, draftId), eq(calculations.userId, userId)))
      .for("update");

    const source = await findScenarioOfDraft(tx, id, draftId);

    const [{ total }] = await tx
      .select({ total: count() })
      .from(scenarios)
      .where(eq(scenarios.calculationId, draftId));
    if (total >= MAX_SCENARIOS) {
      throw new AppError("CALC_SCENARIO_LIMIT_REACHED");
    }

    const name = `${source.name.slice(0, MAX_NAME_LENGTH - COPY_SUFFIX.length)}${COPY_SUFFIX}`;
    const [created] = await tx
      .insert(scenarios)
      .values({
        calculationId: draftId,
        name,
        isBase: false,
        priceOverride: source.priceOverride,
        volumeOverride: source.volumeOverride,
      })
      .returning(scenarioColumns);

    await touchCalculation(tx, draftId);
    return toScenario(created);
  });
}

/**
 * Renames an alternative and replaces its overrides; null keeps the base
 * value.
 *
 * @throws ZodError when the name, price or volume breaks its field rule.
 * @throws AppError CALC_SCENARIO_INVALID_PRICE for a manual price of 0.
 * @throws AppError CALC_DRAFT_MISSING when the user has no draft.
 * @throws AppError CALC_SCENARIO_NOT_FOUND for a missing or foreign scenario.
 * @throws AppError CALC_SCENARIO_BASE_LOCKED when the scenario is the base.
 */
export async function updateScenarioService(
  userId: VerifiedUserId,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<CalculatorScenario> {
  const { scenarioId, ...fields } = (input ?? {}) as Record<string, unknown>;
  const id = requireScenarioId(scenarioId);
  const { name, priceOverride, volumeOverride } = updateScenarioInputSchema.parse(fields);
  if (priceOverride !== null && new Decimal(priceOverride).lte(0)) {
    throw new AppError("CALC_SCENARIO_INVALID_PRICE");
  }

  const draftId = await requireDraftId(userId, db);

  return db.transaction(async (tx) => {
    const scenario = await findScenarioOfDraft(tx, id, draftId);
    if (scenario.isBase) {
      throw new AppError("CALC_SCENARIO_BASE_LOCKED");
    }

    const [updated] = await tx
      .update(scenarios)
      .set({ name, priceOverride, volumeOverride })
      .where(and(eq(scenarios.id, id), eq(scenarios.calculationId, draftId)))
      .returning(scenarioColumns);

    await touchCalculation(tx, draftId);
    return toScenario(updated);
  });
}

/**
 * Deletes an alternative of the draft.
 *
 * @throws AppError CALC_DRAFT_MISSING when the user has no draft.
 * @throws AppError CALC_SCENARIO_NOT_FOUND for a missing or foreign scenario.
 * @throws AppError CALC_SCENARIO_BASE_LOCKED when the scenario is the base.
 */
export async function deleteScenarioService(
  userId: VerifiedUserId,
  scenarioId: unknown,
  db: Db = getDrizzleClient(),
): Promise<CalculatorScenario> {
  const id = requireScenarioId(scenarioId);
  const draftId = await requireDraftId(userId, db);

  return db.transaction(async (tx) => {
    const scenario = await findScenarioOfDraft(tx, id, draftId);
    if (scenario.isBase) {
      throw new AppError("CALC_SCENARIO_BASE_LOCKED");
    }

    await tx
      .delete(scenarios)
      .where(and(eq(scenarios.id, id), eq(scenarios.calculationId, draftId)));

    await touchCalculation(tx, draftId);
    return toScenario(scenario);
  });
}
