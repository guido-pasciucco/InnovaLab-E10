"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { AppError } from "@/lib/errors/app-error";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import type { ProductFormValues } from "@/lib/schemas/products/products";
import {
  createProductService,
  deleteProductService,
  updateProductService,
} from "@/lib/services/products";

type SaveProductPayload = ProductFormValues & { id?: string };

// Creates or updates a product and its recipe: `id` present → update, absent →
// create. The service validates the recipe against the user's current catalog.
export const saveProduct = handleActionErrors(async (_prev, data: SaveProductPayload) => {
  const user = await requireUser();
  const { id, ...input } = data;

  if (id) {
    const product = await updateProductService(user.id, id, input);
    if (!product) throw new AppError("PRODUCT_NOT_FOUND");
    revalidatePath("/products");
    return product;
  }

  const product = await createProductService(user.id, input);
  revalidatePath("/products");
  return product;
});

export const deleteProduct = handleActionErrors(async (_prev, data: { id: string }) => {
  const user = await requireUser();
  const deleted = await deleteProductService(user.id, data.id);
  if (!deleted) throw new AppError("PRODUCT_NOT_FOUND");
  revalidatePath("/products");
  return { deleted: true as const };
});
