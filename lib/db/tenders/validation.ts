import { z } from "zod/v4";

import {
  decrementPercentField,
  MAX_TENDER_ITEMS,
  negotiationContactField,
  offerEmptyMessage,
  orderTermsField,
  roundCountField,
  roundHoursField,
  startingPriceField,
  tenderDuplicateItemMessage,
  tenderItemsLengthMessage,
  tenderQuantityField,
  tenderSpecsField,
  tenderSuppliersMessage,
  unitPriceField,
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

// Offers of one supplier in one submission (RN-10, RN-20). Items left blank
// are not quoted (a basket may be quoted partially); at least one price.
function isBlankOffer(offer: unknown): boolean {
  const price = (offer as { unitPrice?: unknown } | null)?.unitPrice;
  return price === undefined || price === null || String(price).trim() === "";
}

export const submitOffersInputSchema = z.object({
  offers: z.preprocess(
    (offers) => (Array.isArray(offers) ? offers.filter((offer) => !isBlankOffer(offer)) : offers),
    z
      .array(z.object({ itemId: uuid, unitPrice: unitPriceField }), { error: offerEmptyMessage })
      .min(1, { error: offerEmptyMessage }),
  ),
});

// RN-14: choose the supplier of an item, at the agreed unit price.
export const awardItemInputSchema = z.object({
  itemId: uuid,
  invitationId: uuid,
  unitPrice: unitPriceField,
});

// RN-21: ask a supplier to negotiate, sharing the emprendedor's contact.
export const negotiationInputSchema = z.object({
  invitationId: uuid,
  contact: negotiationContactField,
});

// RN-15: the terms the emprendedor completes on the purchase order.
export const purchaseOrderInputSchema = z.object({
  invitationId: uuid,
  deliveryTerms: orderTermsField("las condiciones de entrega"),
  paymentTerms: orderTermsField("las condiciones de pago"),
});
