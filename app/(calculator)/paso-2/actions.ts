"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { AppError } from "@/lib/errors/app-error";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { advanceCalculatorProgressService } from "@/lib/services/calculator";
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

// "Siguiente": unlocks step 3 and goes there. No minimum of cost lines is
// required. redirect() throws, so it stays outside any try/catch.
export async function continueToVariableCosts(): Promise<void> {
  const user = await requireUser();

  try {
    await advanceCalculatorProgressService(user.id, 3);
  } catch (err) {
    if (err instanceof AppError && err.code === "CALC_DRAFT_MISSING") {
      redirect("/paso-1");
    }
    throw err;
  }

  revalidateCalculator();
  redirect("/paso-3");
}
