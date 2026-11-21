"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { submitOffersService } from "@/lib/services/tenders";

const PRICE_FIELD = /^price-(.+)$/;

// The supplier's offer form: one "price-<itemId>" input per item. The service
// checks the invitation, the round and every price (RN-10, RN-12, RN-20).
export const submitOffers = handleActionErrors(async (_previous: unknown, data: FormData) => {
  const user = await requireUser();
  const tenderId = String(data.get("tenderId") ?? "");
  const offers: { itemId: string; unitPrice: string }[] = [];
  for (const [name, value] of data.entries()) {
    const match = PRICE_FIELD.exec(name);
    if (match) offers.push({ itemId: match[1], unitPrice: String(value) });
  }
  const result = await submitOffersService(user.id, tenderId, { offers });
  revalidatePath(`/proveedor/licitaciones/${tenderId}`);
  return result;
});
