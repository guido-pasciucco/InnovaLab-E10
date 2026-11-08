"use server";

import {
  advanceThenRedirect,
  revalidateCalculator,
} from "@/app/(calculator)/revalidate-calculator";
import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import {
  addCalcCostLineService,
  removeCalcCostLineService,
  updateCalcCostLineAmountService,
  updateCalcCostLineConceptService,
} from "@/lib/services/cost";

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

// "Siguiente": unlocks step 3 and goes there.
export async function continueToVariableCosts(): Promise<void> {
  await advanceThenRedirect(3, "/paso-3");
}
