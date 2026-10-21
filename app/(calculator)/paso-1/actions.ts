"use server";

import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { saveCalculatorSetupService } from "@/lib/services/calculator";

export const saveCalculatorSetup = handleActionErrors(async (_prev, data) => {
  const user = await requireUser();

  return saveCalculatorSetupService(user.id, data);
}, "CALC_UNAVAILABLE");
