"use server";

import {
  advanceThenRedirect,
  revalidateCalculator,
} from "@/app/(calculator)/revalidate-calculator";
import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import {
  deleteScenarioService,
  duplicateScenarioService,
  updateScenarioService,
} from "@/lib/services/scenarios";

// The services validate and check ownership; the actions pass the raw input
// through and refresh the comparison the page reads on the server.

const duplicate = handleActionErrors(async (scenarioId: string) => {
  const user = await requireUser();

  const created = await duplicateScenarioService(user.id, scenarioId);

  revalidateCalculator();

  return created;
}, "CALC_UNAVAILABLE");

// Form action of "Duplicar escenario". At the limit the button is disabled; a
// second tab that still submits changes nothing and the page re-renders as is.
export async function duplicateScenario(formData: FormData): Promise<void> {
  const result = await duplicate(String(formData.get("scenarioId") ?? ""));
  if (!result.ok) revalidateCalculator();
}

export const updateScenario = handleActionErrors(async (input: unknown) => {
  const user = await requireUser();

  const saved = await updateScenarioService(user.id, input);

  revalidateCalculator();

  return saved;
}, "CALC_UNAVAILABLE");

export const deleteScenario = handleActionErrors(async (scenarioId: string) => {
  const user = await requireUser();

  const removed = await deleteScenarioService(user.id, scenarioId);

  revalidateCalculator();

  return removed;
}, "CALC_UNAVAILABLE");

// "Siguiente": unlocks step 8 and goes there.
export async function continueToStep8(): Promise<void> {
  await advanceThenRedirect(8, "/paso-8");
}
