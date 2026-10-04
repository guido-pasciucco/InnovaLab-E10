import type { ServiceResult } from "@/lib/errors/catalog";
import type { CalculatorSetup } from "@/lib/schemas/calculator-setup/calculator-setup";

// Calculator setup form state for useActionState.
// The initial value is undefined (nothing submitted yet).
export type CalculatorSetupState = ServiceResult<CalculatorSetup> | undefined;
