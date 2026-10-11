import { z } from "zod";

import { currencyField, periodField, productNameField, unitField, volumeField } from "./fields";

// Form contract (client only): RHF validates with it before submitting.
// Field rules and messages come from ./fields, once. The server never uses this
// contract: the service validates with lib/db/calculation/validation.ts, built
// from the same fields, so its ZodError carries the same messages.
export const calculatorSetupSchema = z.object({
  name: productNameField,
  unit: unitField,
  volume: volumeField,
  currency: currencyField,
  period: periodField,
});

export type CalculatorSetup = z.infer<typeof calculatorSetupSchema>;
