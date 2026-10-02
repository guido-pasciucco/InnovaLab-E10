import { z } from "zod";

import { currencyField, periodField, productNameField, unitField, volumeField } from "./fields";

// Input validation at the edge: strict contract before touching the calculator.
// Field rules and messages come from ./fields, once: RHF shows them in the
// client and the service's ZodError carries them to the server response
// (details.fieldErrors).
export const calculatorSetupSchema = z.object({
  name: productNameField,
  unit: unitField,
  volume: volumeField,
  currency: currencyField,
  period: periodField,
});

export type CalculatorSetup = z.infer<typeof calculatorSetupSchema>;
