"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import type { PublishTenderFormValues, TenderDraftFormValues } from "@/lib/schemas/tenders/publish";
import {
  awardItemService,
  issuePurchaseOrderService,
  requestNegotiationService,
  sendThankYouNoteService,
} from "@/lib/services/tender-purchases";
import { discardTenderDraftService, saveTenderDraftService } from "@/lib/services/tender-drafts";
import {
  acknowledgeNoOfferWarningService,
  cancelTenderService,
  publishTenderService,
} from "@/lib/services/tenders";

// Doors of the emprendedor's tender screens. Each one validates the session
// once and passes the raw input to the service, which validates it.

export const publishTender = handleActionErrors(
  async (_previous: unknown, payload: PublishTenderFormValues) => {
    const user = await requireUser();
    const { id } = await publishTenderService(user.id, payload);
    revalidatePath("/licitaciones");
    redirect(`/licitaciones/${id}`);
  },
);

// Saves the half-filled publish form, even without suppliers, to publish it
// later. The payload has the publish form's shape plus the unticked suppliers.
export const saveTenderDraft = handleActionErrors(async (_previous: unknown, payload: TenderDraftFormValues) => {
  const user = await requireUser();
  await saveTenderDraftService(user.id, payload);
  revalidatePath("/licitaciones");
  return { savedAt: new Date().toISOString() };
});

export const discardTenderDraft = handleActionErrors(async () => {
  const user = await requireUser();
  await discardTenderDraftService(user.id);
  revalidatePath("/licitaciones");
  redirect("/licitaciones");
});

// RN-18: let the tender continue after the "items without offers" warning.
export const acknowledgeNoOfferWarning = handleActionErrors(async (_previous: unknown, data: FormData) => {
  const user = await requireUser();
  const tenderId = String(data.get("tenderId") ?? "");
  await acknowledgeNoOfferWarningService(user.id, tenderId);
  revalidatePath(`/licitaciones/${tenderId}`);
  revalidatePath("/licitaciones");
  return { acknowledged: true as const };
});

function refresh(tenderId: string) {
  revalidatePath(`/licitaciones/${tenderId}`);
}

// RN-14: choose the supplier of one item at the agreed price.
export const awardItem = handleActionErrors(async (_previous: unknown, data: FormData) => {
  const user = await requireUser();
  const tenderId = String(data.get("tenderId") ?? "");
  await awardItemService(user.id, tenderId, {
    itemId: data.get("itemId"),
    invitationId: data.get("invitationId"),
    unitPrice: data.get("unitPrice"),
  });
  refresh(tenderId);
  return { awarded: true as const };
});

// RN-21: ask a supplier to negotiate; it sees the contact in its panel.
export const requestNegotiation = handleActionErrors(async (_previous: unknown, data: FormData) => {
  const user = await requireUser();
  const tenderId = String(data.get("tenderId") ?? "");
  await requestNegotiationService(user.id, tenderId, {
    invitationId: data.get("invitationId"),
    contact: data.get("contact"),
  });
  refresh(tenderId);
  return { requested: true as const };
});

// RN-15: issue the purchase order of one awarded supplier.
export const issuePurchaseOrder = handleActionErrors(async (_previous: unknown, data: FormData) => {
  const user = await requireUser();
  const tenderId = String(data.get("tenderId") ?? "");
  const order = await issuePurchaseOrderService(user.id, tenderId, {
    invitationId: data.get("invitationId"),
    deliveryTerms: data.get("deliveryTerms"),
    paymentTerms: data.get("paymentTerms"),
  });
  refresh(tenderId);
  redirect(`/licitaciones/${tenderId}/ordenes/${order.id}`);
});

// RN-16: show the thank-you note to the suppliers not chosen.
export const sendThankYouNote = handleActionErrors(async (_previous: unknown, data: FormData) => {
  const user = await requireUser();
  const tenderId = String(data.get("tenderId") ?? "");
  await sendThankYouNoteService(user.id, tenderId);
  refresh(tenderId);
  return { sent: true as const };
});

export const cancelTender = handleActionErrors(async (_previous: unknown, data: FormData) => {
  const user = await requireUser();
  const tenderId = String(data.get("tenderId") ?? "");
  await cancelTenderService(user.id, tenderId);
  revalidatePath(`/licitaciones/${tenderId}`);
  revalidatePath("/licitaciones");
  return { cancelled: true as const };
});
