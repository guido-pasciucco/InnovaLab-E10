import { z } from "zod/v4";

import {
  decrementPercentField,
  MAX_TENDER_ITEMS,
  roundCountField,
  roundHoursField,
  startingPriceField,
  tenderDuplicateItemMessage,
  tenderItemsLengthMessage,
  tenderQuantityField,
  tenderSpecsField,
  tenderSuppliersMessage,
} from "@/lib/schemas/tenders/fields";

// Server gate for publishing a tender (RN-02, RN-05). Server-controlled
// fields (owner, number, start and end times, catalog copies) are not part of
// the input.

const uuid = z.uuid({ error: "Elegí un valor de la lista." });

export const publishTenderItemInputSchema = z.object({
  supplyId: uuid,
  quantity: tenderQuantityField,
  specs: tenderSpecsField,
  startingPrice: startingPriceField,
});

export const publishTenderInputSchema = z.object({
  roundHours: roundHoursField,
  roundCount: roundCountField,
  decrementPercent: decrementPercentField,
  items: z
    .array(publishTenderItemInputSchema, { error: tenderItemsLengthMessage })
    .min(1, { error: tenderItemsLengthMessage })
    .max(MAX_TENDER_ITEMS, { error: tenderItemsLengthMessage })
    .refine((items) => new Set(items.map((item) => item.supplyId)).size === items.length, {
      error: tenderDuplicateItemMessage,
    }),
  supplierIds: z
    .array(uuid, { error: tenderSuppliersMessage })
    .min(1, { error: tenderSuppliersMessage })
    .transform((ids) => [...new Set(ids)]),
});

export type PublishTenderInput = z.infer<typeof publishTenderInputSchema>;
