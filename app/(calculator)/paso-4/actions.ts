"use server";

import {
  advanceThenRedirect,
  revalidateCalculator,
} from "@/app/(calculator)/revalidate-calculator";
import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import {
  addIndirectCalcCostLineService,
  removeIndirectCalcCostLineService,
  saveOwnLaborService,
  updateIndirectCalcCostLineAmountService,
  updateIndirectCalcCostLineConceptService,
} from "@/lib/services/own-labor";

export const saveOwnLabor = handleActionErrors(async (input: unknown) => {
  const user = await requireUser();

  await saveOwnLaborService(user.id, input);

  revalidateCalculator();

  return {};
}, "CALC_UNAVAILABLE");

export const addIndirectCostLine = handleActionErrors(async (input: unknown) => {
  const user = await requireUser();

  const line = await addIndirectCalcCostLineService(user.id, input);

  revalidateCalculator();

  return { id: line.id };
}, "CALC_UNAVAILABLE");

export const updateIndirectCostAmount = handleActionErrors(
  async (lineId: string, input: unknown) => {
    const user = await requireUser();

    const line = await updateIndirectCalcCostLineAmountService(user.id, lineId, input);

    revalidateCalculator();

    return { id: line.id };
  },
  "CALC_UNAVAILABLE",
);

export const renameIndirectCostLine = handleActionErrors(
  async (lineId: string, input: unknown) => {
    const user = await requireUser();

    const line = await updateIndirectCalcCostLineConceptService(user.id, lineId, input);

    revalidateCalculator();

    return { id: line.id };
  },
  "CALC_UNAVAILABLE",
);

export const removeIndirectCostLine = handleActionErrors(async (lineId: string) => {
  const user = await requireUser();

  const line = await removeIndirectCalcCostLineService(user.id, lineId);

  revalidateCalculator();

  return { id: line.id };
}, "CALC_UNAVAILABLE");

// "Siguiente": unlocks step 5 and goes there.
export async function continueToStep5(): Promise<void> {
  await advanceThenRedirect(5, "/paso-5");
}
