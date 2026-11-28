"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { closeCalculationService } from "@/lib/services/calculation-closures";

// Closing is manual and explicit: the client sends no data at all, not even a
// period. The service resolves the business from the session and only accepts
// the current Argentina month (D27/D50).
export const closeCalculation = handleActionErrors(async () => {
  const user = await requireUser();
  const closure = await closeCalculationService(user.id);

  revalidatePath("/equilibrio");
  revalidatePath("/historico");
  revalidatePath(`/historico/${closure.period}`);

  return {
    period: closure.period,
    version: closure.version,
    closedAt: closure.closedAt.toISOString(),
  };
});
