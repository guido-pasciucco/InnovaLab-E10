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

// "Siguiente" on step 4 skips step 5 and unlocks step 6 directly. Step 5
// (cost of sales and taxes) is optional for the price: the engine treats
// absent taxes and commissions as "no extra charges" (docs/producto/05-Motor
// de cálculo, §11), so it stays a placeholder for now and the forward flow
// goes from step 4 to the margin and suggested price.
export async function continueToStep6(): Promise<void> {
  await advanceThenRedirect(6, "/paso-6");
}
