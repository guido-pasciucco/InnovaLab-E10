import { z } from "zod";

import { recipeYieldField } from "./fields";

export const recipeYieldSchema = z.object({
  yieldQuantity: recipeYieldField,
});

export type RecipeYieldValues = z.infer<typeof recipeYieldSchema>;
