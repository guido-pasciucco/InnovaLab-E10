"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import {
  addVariableCalcCostLineService,
  removeVariableCalcCostLineService,
  updateVariableCalcCostLineAmountService,
  updateVariableCalcCostLineConceptService,
} from "@/lib/services/cost";

// The step and the shell's live cost card read the lines on the server, so each
// write invalidates the whole calculator layout: the totals the user sees are
// always the ones the server just summed.
const revalidateCalculator = () => revalidatePath("/", "layout");

export const addVariableCostLine = handleActionErrors(async (input: unknown) => {
  const user = await requireUser();

  const line = await addVariableCalcCostLineService(user.id, input);

  revalidateCalculator();

  return { id: line.id };
}, "CALC_UNAVAILABLE");

export const updateVariableCostAmount = handleActionErrors(
  async (lineId: string, input: unknown) => {
    const user = await requireUser();

    const line = await updateVariableCalcCostLineAmountService(user.id, lineId, input);

    revalidateCalculator();

    return { id: line.id };
  },
  "CALC_UNAVAILABLE",
);

export const renameVariableCostLine = handleActionErrors(
  async (lineId: string, input: unknown) => {
    const user = await requireUser();

    const line = await updateVariableCalcCostLineConceptService(user.id, lineId, input);

    revalidateCalculator();

    return { id: line.id };
  },
  "CALC_UNAVAILABLE",
);

export const removeVariableCostLine = handleActionErrors(async (lineId: string) => {
  const user = await requireUser();

  const line = await removeVariableCalcCostLineService(user.id, lineId);

  revalidateCalculator();

  return { id: line.id };
}, "CALC_UNAVAILABLE");
