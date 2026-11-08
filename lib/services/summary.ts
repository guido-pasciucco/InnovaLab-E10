import "server-only";

import { calculateBreakEven } from "@/lib/calc/calculateBreakEven";
import { calculatePricing } from "@/lib/calc/calculatePricing";
import { realMarginPct } from "@/lib/calc/compareScenarios";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import type {
  CalculatorCostSummary,
  CalculatorSummary,
  CalculatorSummaryStatus,
} from "@/lib/types/calculator";

import { getCalculatorCostSummaryService, getDraftSetupForUser } from "./calculator";
import { getCalculatorPricingInputsService } from "./pricing";

// Step 8 read model: the figures of steps 1-6 in one place, for the summary
// screen, "Copiar resumen" and the PDF. It composes the existing read services
// (each one resolves the caller's own draft, so owner scoping comes from them)
// and runs the same engine calls as steps 5 and 6, so every step agrees on the
// price, the profit and the break-even. It never writes.
// The service throws (AppError from the cost summary); doors translate. No try/catch.

type Figures = Pick<
  CalculatorSummary,
  | "status"
  | "suggestedPrice"
  | "realMarginPct"
  | "estimatedProfit"
  | "breakEvenUnits"
  | "breakEvenSales"
>;

function withoutFigures(status: Exclude<CalculatorSummaryStatus, "ready">): Figures {
  return {
    status,
    suggestedPrice: null,
    realMarginPct: null,
    estimatedProfit: null,
    breakEvenUnits: null,
    breakEvenSales: null,
  };
}

// Same status rules as step 6 (toBreakEvenStepProps): an engine rejection of
// the margin points back to step 5, any other one to the costs.
function figuresFor(costs: CalculatorCostSummary, marginPct: string | null): Figures {
  const { unitCost, variableUnit, totalFixed, volume } = costs;
  if (unitCost === null || variableUnit === null || totalFixed === null || volume === null) {
    return withoutFigures("missing-costs");
  }
  if (marginPct === null) return withoutFigures("missing-margin");

  const pricing = calculatePricing({ unitCost, variableUnit, totalFixed, volume, marginPct });
  if (!pricing.ok) {
    return withoutFigures(pricing.code === "INVALID_MARGIN" ? "missing-margin" : "missing-costs");
  }

  const price = pricing.suggestedPrice;
  const breakEven = calculateBreakEven({ price, variableUnit, totalFixed, volume });
  if (!breakEven.ok) {
    return withoutFigures(
      breakEven.code === "NO_CONTRIBUTION" ? "no-contribution" : "missing-costs",
    );
  }

  return {
    status: "ready",
    suggestedPrice: price,
    realMarginPct: realMarginPct(price, unitCost),
    estimatedProfit: pricing.estimatedProfit,
    breakEvenUnits: breakEven.breakEvenUnits,
    breakEvenSales: breakEven.breakEvenSales,
  };
}

/**
 * Read model for step 8. It never writes.
 *
 * Null semantics: see CalculatorSummary. No draft returns `calculationId` null
 * and status "missing-costs".
 *
 * @throws AppError CALC_COST_SUMMARY_FAILED when the engine rejects the
 * persisted cost lines (see getCalculatorCostSummaryService).
 */
export async function getCalculatorSummaryService(
  userId: string,
  db: Db = getDrizzleClient(),
): Promise<CalculatorSummary> {
  const [draft, costs, pricing] = await Promise.all([
    getDraftSetupForUser(userId, db),
    getCalculatorCostSummaryService(userId, db),
    getCalculatorPricingInputsService(userId, db),
  ]);

  return {
    calculationId: draft.calculationId,
    productName: draft.setup?.name ?? null,
    period: draft.setup?.period ?? null,
    volume: draft.setup?.volume ?? null,
    unitCost: costs.unitCost,
    ...figuresFor(costs, pricing.expectedMarginPct),
    currency: "ARS",
  };
}
