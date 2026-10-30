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
