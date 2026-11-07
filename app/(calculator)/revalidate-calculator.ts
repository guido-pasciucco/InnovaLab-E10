import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { AppError } from "@/lib/errors/app-error";
import { advanceCalculatorProgressService } from "@/lib/services/calculator";

// Shared by the step actions. Not a "use server" module: it exports helpers
// the actions call, not actions the client can invoke.

// The step and the shell's live cost card read the lines on the server, so each
// write invalidates the whole calculator layout: the totals the user sees are
// always the ones the server just summed.
export const revalidateCalculator = () => revalidatePath("/", "layout");

// "Siguiente" of a step that unlocks the next one: advance the progress, then
// go there. No minimum of cost lines is required. redirect() throws, so it
// stays outside any try/catch that could swallow it.
export async function advanceThenRedirect(
  toStep: number,
  destination: string,
): Promise<never> {
  const user = await requireUser();

  try {
    await advanceCalculatorProgressService(user.id, toStep);
  } catch (err) {
    // No draft to advance: the user has to save step 1 first.
    if (err instanceof AppError && err.code === "CALC_DRAFT_MISSING") {
      redirect("/paso-1");
    }
    throw err;
  }

  revalidateCalculator();
  redirect(destination);
}
