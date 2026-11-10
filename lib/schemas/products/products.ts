import { z } from "zod";

import { productNameField } from "@/lib/schemas/calculator-setup/fields";
import { recipeQuantityField, recipeSupplyField } from "./fields";

// Form contract (client only): RHF validates with it before submitting. The
// server will validate with lib/db/products/validation.ts once persistence
// lands; both contracts should compose the same field rules from ./fields.ts
// (and productNameField).
//
// Scope of issue #240: name + recipe. Purchase unit, unit cost and monthly
// capacity stay out of this story.

export const recipeItemSchema = z.object({
  supplyId: recipeSupplyField,
  quantity: recipeQuantityField,
});

export const productFormSchema = z
  .object({
    name: productNameField,
    recipe: z
      .array(recipeItemSchema)
      .min(1, { error: "Agregá al menos un insumo a la receta." }),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();

    value.recipe.forEach((item, index) => {
      // An empty select is already reported as required; do not add a
      // duplicate error on top of it.
      if (!item.supplyId) return;

      if (seen.has(item.supplyId)) {
        ctx.addIssue({
          code: "custom",
          message: "Ese insumo ya está en la receta.",
          path: ["recipe", index, "supplyId"],
        });
      }

      seen.add(item.supplyId);
    });
  });

// Single source of truth: types are inferred from the schema, no hand-written
// interface to keep in sync.
export type ProductFormValues = z.infer<typeof productFormSchema>;

// Shape the client needs to list, edit and show a saved recipe. The supply
// name is a snapshot for the UI; once persistence lands it can come from the
// services join instead.
export type ProductRecipeItem = {
  supplyId: string;
  supplyName: string;
  quantity: string;
};

export type ProductItem = {
  id: string;
  name: string;
  recipe: ProductRecipeItem[];
};

// Minimal shape the recipe selector needs from the supply catalog.
export type RecipeSupplyOption = {
  id: string;
  name: string;
};
