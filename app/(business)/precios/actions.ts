"use server";

import { revalidatePath } from "next/cache";

import { toPricingView } from "@/components/pricing/pricing-values";
import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import {
  getPricingService,
  saveDefaultMarkupPercentService,
  saveSaleRowMarkupPercentService,
} from "@/lib/services/pricing";

const PRECIOS_PATH = "/precios";

// Server Actions for the pricing screen (#312). The services resolve the
// business and products from the session user, so the client never sends an
// owner or business id. Every action returns the freshly derived view: the
// client swaps it in without a reload, and `revalidatePath` keeps a later
// reload in sync.

export const saveDefaultMarkup = handleActionErrors(
  async (_prev: unknown, data: { defaultMarkupPercent: string | null }) => {
    const user = await requireUser();
    await saveDefaultMarkupPercentService(user.id, data);

    revalidatePath(PRECIOS_PATH);

    return toPricingView(await getPricingService(user.id));
  },
);

export const saveProductMarkup = handleActionErrors(
  async (
    _prev: unknown,
    data: { productId: string; presentationId: string | null; markupPercent: string | null },
  ) => {
    const user = await requireUser();
    await saveSaleRowMarkupPercentService(
      user.id,
      { productId: data.productId, presentationId: data.presentationId },
      { markupPercent: data.markupPercent },
    );

    revalidatePath(PRECIOS_PATH);

    return toPricingView(await getPricingService(user.id));
  },
);
