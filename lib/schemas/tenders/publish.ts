import { z } from "zod";

import {
  decrementPercentField,
  MAX_TENDER_ITEMS,
  roundCountField,
  roundHoursField,
  startingPriceField,
  tenderItemsLengthMessage,
  tenderQuantityField,
  tenderSpecsField,
  tenderSuppliersMessage,
} from "./fields";

// Client contract of the publish form: checks every item row before the
// payload leaves the browser, so each error shows under its input. The server
// validates again with lib/db/tenders/validation.ts (same field rules).

export const publishTenderFormSchema = z.object({
  roundHours: roundHoursField,
  roundCount: roundCountField,
  decrementPercent: decrementPercentField,
  items: z
    .array(
      z.object({
        supplyId: z.string().min(1),
        quantity: tenderQuantityField,
        specs: tenderSpecsField,
        startingPrice: startingPriceField,
      }),
    )
    .min(1, { error: tenderItemsLengthMessage })
    .max(MAX_TENDER_ITEMS, { error: tenderItemsLengthMessage }),
  supplierIds: z.array(z.string()).min(1, { error: tenderSuppliersMessage }),
});

export type PublishTenderFormValues = z.input<typeof publishTenderFormSchema>;

// What "Guardar borrador" sends: the form as it is, valid or not, with the
// suppliers the emprendedor unticked (server gate: tenderDraftInputSchema).
export type TenderDraftFormValues = {
  roundHours: string;
  roundCount: string;
  decrementPercent: string;
  items: { supplyId: string; quantity: string; specs: string; startingPrice: string }[];
  excludedSupplierIds: string[];
};

// Issue path → "items.0.quantity", the key the form uses for each input.
export function publishFormErrors(values: unknown): Record<string, string> {
  const result = publishTenderFormSchema.safeParse(values);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}
