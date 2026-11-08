"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { saveCalculatorSetupService } from "@/lib/services/calculator";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";

export const saveCalculatorSetup = handleActionErrors(async (_prev, data) => {
  await requireUser();

  const setup = await saveCalculatorSetupService(await createRscSupabaseClient(), data);

  // The wizard layout reads the persisted step on the server and is not
  // re-rendered by a client navigation. Invalidate it so the header and the
  // progress bar advance as soon as the user lands on the next step.
  revalidatePath("/", "layout");

  return setup;
}, "CALC_UNAVAILABLE");
