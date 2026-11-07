"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { resumeHref } from "@/components/calculator/wizard/wizard-steps";
import { logoutService } from "@/lib/services/auth";
import {
  createCalculationService,
  setActiveCalculationService,
} from "@/lib/services/calculations";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";

// Action door for the dashboard sign-out button. Called directly (no form),
// it returns the result so the client can show failures inline instead of
// navigating blindly. handleActionErrors keeps unexpected throws out of
// the client; sign-out failures surface as AUTH_SIGNOUT_FAILED.
export const logout = handleActionErrors(
  async () => logoutService(await createRscSupabaseClient()),
  "AUTH_SIGNOUT_FAILED",
);

const reopen = handleActionErrors(async (calculationId: string) => {
  const user = await requireUser();
  return setActiveCalculationService(user.id, calculationId);
});

const create = handleActionErrors(async () => {
  const user = await requireUser();
  return createCalculationService(user.id);
});

// Form action: makes the chosen calculation active and opens the furthest
// step saved for it. A missing or foreign id changes nothing and keeps the
// user on the dashboard. Redirects happen outside handleActionErrors so the
// result type stays a plain void for <form action>.
export async function continueCalculation(formData: FormData): Promise<void> {
  const result = await reopen(String(formData.get("calculationId") ?? ""));
  if (!result.ok) redirect("/dashboard");

  revalidatePath("/", "layout");
  redirect(resumeHref(result.data.currentStep));
}

// Form action: creates an empty draft, makes it active and opens step 1.
export async function createCalculation(): Promise<void> {
  const result = await create();
  if (!result.ok) redirect("/dashboard");

  revalidatePath("/", "layout");
  redirect("/paso-1");
}
