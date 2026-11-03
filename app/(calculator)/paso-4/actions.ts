"use server";

import { advanceThenRedirect } from "@/app/(calculator)/revalidate-calculator";

// "Siguiente" on step 4 skips step 5 and unlocks step 6 directly. Step 5
// (cost of sales and taxes) is optional for the price: the engine treats
// absent taxes and commissions as "no extra charges" (docs/producto/05-Motor
// de cálculo, §11), so it stays a placeholder for now and the forward flow
// goes from step 4 to the margin and suggested price.
export async function continueToStep6(): Promise<void> {
  await advanceThenRedirect(6, "/paso-6");
}
