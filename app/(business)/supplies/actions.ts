"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { AppError } from "@/lib/errors/app-error";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import type { Supply } from "@/lib/schemas/supplies/supplies";
import {
  createSupplyService,
  deleteSupplyService,
  updateSupplyService,
} from "@/lib/services/supplies";

type SaveSupplyPayload = Supply & { id?: string };

// Creates or updates a supply: `id` present → update, absent → create.
export const saveSupply = handleActionErrors(async (_prev, data: SaveSupplyPayload) => {
  const user = await requireUser();
  const { id, ...input } = data;

  if (id) {
    const supply = await updateSupplyService(user.id, id, input);
    if (!supply) throw new AppError("SUPPLY_NOT_FOUND");
    revalidatePath("/supplies");
    return supply;
  }

  const supply = await createSupplyService(user.id, input);
  revalidatePath("/supplies");
  return supply;
});

export const deleteSupply = handleActionErrors(async (_prev, data: { id: string }) => {
  const user = await requireUser();
  const deleted = await deleteSupplyService(user.id, data.id);
  if (!deleted) throw new AppError("SUPPLY_NOT_FOUND");
  revalidatePath("/supplies");
  return { deleted: true as const };
});
