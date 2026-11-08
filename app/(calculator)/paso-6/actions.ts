"use server";

import { advanceThenRedirect } from "@/app/(calculator)/revalidate-calculator";

// "Siguiente": unlocks step 7 and goes there.
export async function continueToStep7(): Promise<void> {
  await advanceThenRedirect(7, "/paso-7");
}
