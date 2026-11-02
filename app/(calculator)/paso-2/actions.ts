"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import {
  addCalcCostLineService,
  removeCalcCostLineService,
  updateCalcCostLineAmountService,
  updateCalcCostLineConceptService,
} from "@/lib/services/cost";

// The step and the shell's live cost card read the lines on the server, so each
// write invalidates the whole calculator layout: the totals the user sees are
// always the ones the server just summed.
const revalidateCalculator = () => revalidatePath("/", "layout");

export const addFixedCostLine = handleActionErrors(async (input: unknown) => {
  const user = await requireUser();

  const line = await addCalcCostLineService(user.id, input);

  revalidateCalculator();

  return { id: line.id };
}, "CALC_UNAVAILABLE");

export const updateFixedCostAmount = handleActionErrors(
  async (lineId: string, input: unknown) => {
    const user = await requireUser();

    const line = await updateCalcCostLineAmountService(user.id, lineId, input);

    revalidateCalculator();

    return { id: line.id };
  },
  "CALC_UNAVAILABLE",
);

export const renameFixedCostLine = handleActionErrors(
  async (lineId: string, input: unknown) => {
    const user = await requireUser();

    const line = await updateCalcCostLineConceptService(user.id, lineId, input);

    revalidateCalculator();

    return { id: line.id };
  },
  "CALC_UNAVAILABLE",
);

export const removeFixedCostLine = handleActionErrors(async (lineId: string) => {
  const user = await requireUser();

  const line = await removeCalcCostLineService(user.id, lineId);

  revalidateCalculator();

  return { id: line.id };
}, "CALC_UNAVAILABLE");
