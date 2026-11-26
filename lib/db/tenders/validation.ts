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
  tenderDraftItemsMessage,
  tenderDuplicateItemMessage,
  tenderItemsLengthMessage,
  tenderQuantityField,
  tenderSpecsField,
  unitPriceField,
} from "@/lib/schemas/tenders/fields";

// Server gate for publishing a tender (RN-02). Server-controlled
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
});

export type PublishTenderInput = z.infer<typeof publishTenderInputSchema>;

// A draft is the half-filled publish form: values may be empty or not yet
// valid (they are fully validated on publish), only bounded in size.
const draftText = (max: number) => z.string().trim().max(max).catch("");

export const tenderDraftInputSchema = z.object({
  roundHours: draftText(3),
  roundCount: draftText(2),
  decrementPercent: draftText(10),
  items: z
    .array(
      z.object({
        supplyId: uuid,
        quantity: draftText(20),
        specs: tenderSpecsField,
        startingPrice: draftText(20),
      }),
      { error: tenderDraftItemsMessage },
    )
    .min(1, { error: tenderDraftItemsMessage })
    .max(MAX_TENDER_ITEMS, { error: tenderItemsLengthMessage })
    .refine((items) => new Set(items.map((item) => item.supplyId)).size === items.length, {
      error: tenderDuplicateItemMessage,
    }),
});

export type TenderDraftInput = z.infer<typeof tenderDraftInputSchema>;

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
  supplierUserId: uuid,
  unitPrice: unitPriceField,
});

// RN-21: ask a supplier to negotiate, sharing the emprendedor's contact.
export const negotiationInputSchema = z.object({
  supplierUserId: uuid,
  contact: negotiationContactField,
});

// RN-15: the terms the emprendedor completes on the purchase order.
export const purchaseOrderInputSchema = z.object({
  supplierUserId: uuid,
  deliveryTerms: orderTermsField("las condiciones de entrega"),
  paymentTerms: orderTermsField("las condiciones de pago"),
});
