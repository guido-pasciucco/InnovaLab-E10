"use server";

import {
  advanceThenRedirect,
  revalidateCalculator,
} from "@/app/(calculator)/revalidate-calculator";
import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { saveExpectedMarginService } from "@/lib/services/pricing";

// Saves the margin when the field is left, like the cost amounts of steps 2
// and 3. The service validates; the action passes the raw input through.
export const saveExpectedMargin = handleActionErrors(async (input: unknown) => {
  const user = await requireUser();

  const saved = await saveExpectedMarginService(user.id, input);

  revalidateCalculator();

  return saved;
}, "CALC_UNAVAILABLE");

// "Siguiente": unlocks step 7 and goes there.
export async function continueToStep7(): Promise<void> {
  await advanceThenRedirect(7, "/paso-7");
}
