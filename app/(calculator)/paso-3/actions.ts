"use server";

import {
  advanceThenRedirect,
  revalidateCalculator,
} from "@/app/(calculator)/revalidate-calculator";
import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import {
  addVariableCalcCostLineService,
  removeVariableCalcCostLineService,
  updateVariableCalcCostLineAmountService,
  updateVariableCalcCostLineConceptService,
} from "@/lib/services/cost";

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

// "Siguiente": unlocks step 4 and goes there.
export async function continueToStep4(): Promise<void> {
  await advanceThenRedirect(4, "/paso-4");
}
