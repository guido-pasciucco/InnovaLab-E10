import type { CompareScenariosResult } from "@/lib/calc/compareScenarios";
import type { ServiceResult } from "@/lib/errors/catalog";
import type { CalculatorSetup } from "@/lib/schemas/calculator-setup/calculator-setup";

// Calculator setup form state for useActionState.
// The initial value is undefined (nothing submitted yet).
export type CalculatorSetupState = ServiceResult<CalculatorSetup> | undefined;

// Read model for the step 1 form: the draft the user is editing and its
// persisted setup. The form uses calculationId to keep saving to the same
// draft; setup is null when the draft exists but was never saved.
export type CalculatorDraftSetup = {
  calculationId: string | null;
  setup: CalculatorSetup | null;
};

// Read model for the step 1 "live unit cost" card (#172). Amounts are decimal
// strings, never numbers. Null means "there are no costs yet" (no draft, or a
// draft with no cost lines), not zero: a draft that does have costs returns
// "0.00" for a category with no lines. `volume` is the setup volume, the same
// divisor the engine uses. `currency` is always "ARS": the calculator only
// supports that currency today (see lib/schemas/calculator-setup/fields.ts).
export type CalculatorCostSummary = {
  calculationId: string | null;
  totalFixed: string | null;
  variableUnit: string | null;
  unitCost: string | null;
  volume: number | null;
  currency: "ARS";
};

// One dashboard card: a calculation the user owns. `currentStep` is the
// furthest wizard step persisted (1..8); `isActive` marks the one the wizard
// currently edits.
export type CalculationSummary = {
  id: string;
  productName: string;
  status: string;
  currentStep: number;
  updatedAt: Date;
  isActive: boolean;
};

// Read model for step 5: the expected margin saved for the draft, in percent
// on the selling price ("30" is 30 %), without trailing zeros. Null means
// nothing was saved yet (no draft, or a draft without `pricing_inputs`).
export type CalculatorPricingInputs = {
  calculationId: string | null;
  expectedMarginPct: string | null;
};

// One step 7 scenario as persisted. Null overrides keep the base value: the
// price from the saved margin, the setup volume. The base never has overrides.
export type CalculatorScenario = {
  id: string;
  name: string;
  isBase: boolean;
  // Manual price per unit as typed ("5000"), or null.
  priceOverride: string | null;
  volumeOverride: number | null;
};

// What the step 7 comparison starts from: the persisted totals and margin.
export type ScenarioComparisonInputs = {
  totalFixed: string;
  variableUnit: string;
  unitCost: string;
  volume: number;
  marginPct: string;
};

// Read model for step 7. The scenarios come base first, then by creation.
//
// Null semantics: no draft returns `calculationId` null and no scenarios;
// `inputs` and `comparison` are null while the costs or the margin are missing
// (the step points back to steps 2, 3 and 5). `comparison` is the engine result
// as-is, so a failure carries its code.
export type ScenarioComparisonView = {
  calculationId: string | null;
  scenarios: CalculatorScenario[];
  inputs: ScenarioComparisonInputs | null;
  comparison: CompareScenariosResult | null;
};

// Why step 8 has no figures to show yet: the same gaps step 6 explains.
export type CalculatorSummaryStatus =
  | "ready"
  | "missing-costs"
  | "missing-margin"
  | "no-contribution";

// Read model for step 8: the figures of steps 1-6 in one place. Amounts are
// decimal strings; `realMarginPct` is a percent with 2 decimals ("30.00") and
// `breakEvenUnits` whole units ("96").
//
// Null semantics: no draft returns `calculationId` null. `productName`,
// `period` and `volume` are null while step 1 has no setup. The figures are
// null unless `status` is "ready", except `unitCost`, which is shown as soon as
// there are costs.
export type CalculatorSummary = {
  calculationId: string | null;
  status: CalculatorSummaryStatus;
  productName: string | null;
  period: string | null;
  volume: number | null;
  unitCost: string | null;
  suggestedPrice: string | null;
  realMarginPct: string | null;
  estimatedProfit: string | null;
  breakEvenUnits: string | null;
  breakEvenSales: string | null;
  currency: "ARS";
};
