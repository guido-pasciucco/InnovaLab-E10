"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { AppError } from "@/lib/errors/app-error";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import type { PresentationFormValues } from "@/lib/schemas/presentations/presentations";
import {
  createPresentationService,
  deletePresentationService,
  removePackagingFromPresentationService,
  updatePresentationService,
} from "@/lib/services/presentations";

type SavePresentationPayload = PresentationFormValues & {
  productId: string;
  id?: string;
};

function revalidate(productId: string) {
  revalidatePath(`/products/${productId}/presentations`);
  revalidatePath("/products");
}

// Creates or updates one presentation of a product: `id` present → update,
// absent → create. The service validates owner, units and packaging.
export const savePresentation = handleActionErrors(
  async (_prev, data: SavePresentationPayload) => {
    const user = await requireUser();
    const { productId, id, ...input } = data;

    if (id) {
      const presentation = await updatePresentationService(user.id, id, input);
      if (!presentation) throw new AppError("PRESENTATION_NOT_FOUND");
      revalidate(productId);
      return presentation;
    }

    const presentation = await createPresentationService(user.id, productId, input);
    if (!presentation) throw new AppError("PRODUCT_NOT_FOUND");
    revalidate(productId);
    return presentation;
  },
);

// Called from the supply-in-use dialog to free a packaging without leaving
// the catalog page.
export const removePackagingFromPresentation = handleActionErrors(
  async (_prev, data: { presentationId: string; productId: string; supplyId: string }) => {
    const user = await requireUser();
    const presentation = await removePackagingFromPresentationService(
      user.id,
      data.presentationId,
      data.supplyId,
    );
    if (!presentation) throw new AppError("PRESENTATION_NOT_FOUND");
    revalidate(data.productId);
    revalidatePath("/supplies");
    return { removed: true as const };
  },
);

export const deletePresentation = handleActionErrors(
  async (_prev, data: { id: string; productId: string }) => {
    const user = await requireUser();
    const deleted = await deletePresentationService(user.id, data.id);
    if (!deleted) throw new AppError("PRESENTATION_NOT_FOUND");
    revalidate(data.productId);
    return { deleted: true as const };
  },
);
