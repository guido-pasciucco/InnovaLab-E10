"use server";

import { createRscSupabaseClient } from "@/lib/supabase/rsc";
import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { saveCalculatorSetupService } from "@/lib/services/calculator";

export const saveCalculatorSetup = handleActionErrors(async (_prev, data) => {
  await requireUser();

  return saveCalculatorSetupService(await createRscSupabaseClient(), data);
}, "CALC_UNAVAILABLE");
