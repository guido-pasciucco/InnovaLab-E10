"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import {
  addCalcCostLineService,
  updateCalcCostLineAmountService,
} from "@/lib/services/cost";

// The step reads its lines on the server, so each write invalidates the page:
// the subtotal the user sees is always the one the server just summed.
const STEP_PATH = "/paso-2";

export const addFixedCostLine = handleActionErrors(async (input: unknown) => {
  const user = await requireUser();

  const line = await addCalcCostLineService(user.id, input);

  revalidatePath(STEP_PATH);

  return { id: line.id };
}, "CALC_UNAVAILABLE");

export const updateFixedCostAmount = handleActionErrors(
  async (lineId: string, input: unknown) => {
    const user = await requireUser();

    const line = await updateCalcCostLineAmountService(user.id, lineId, input);

    revalidatePath(STEP_PATH);

    return { id: line.id };
  },
  "CALC_UNAVAILABLE",
);
