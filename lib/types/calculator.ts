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
