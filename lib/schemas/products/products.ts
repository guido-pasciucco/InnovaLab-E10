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
//
// The recipe only accepts supplies that are available in the current catalog:
// the form builds the schema with `createProductFormSchema(allowedSupplyIds)`,
// so packaging rows and deleted ids are rejected before saving.

export const recipeItemSchema = z.object({
  supplyId: recipeSupplyField,
  quantity: recipeQuantityField,
});

const productFormObjectSchema = z.object({
  name: productNameField,
  recipe: z
    .array(recipeItemSchema)
    .min(1, { error: "Agregá al menos un insumo a la receta." }),
});

// Image of the recipe selector: only insumos are ingredients, packaging never
// is. Filtering here (instead of in the page) keeps the regression covered by
// a pure unit test and gives the page a single mapping function.
export function toRecipeSupplyOptions(
  supplies: readonly { id: string; name: string; kind: string }[],
): RecipeSupplyOption[] {
  return supplies
    .filter((supply) => supply.kind === "supply")
    .map((supply) => ({ id: supply.id, name: supply.name }));
}

// The form owns the catalog snapshot, so validation can reject ids that are no
// longer available (deleted, or packaging) and still detect duplicates.
export function createProductFormSchema(allowedSupplyIds: readonly string[]) {
  const allowed = new Set(allowedSupplyIds);

  return productFormObjectSchema.superRefine((value, ctx) => {
    const seen = new Set<string>();

    value.recipe.forEach((item, index) => {
      // An empty select is already reported as required; do not add a
      // duplicate error on top of it.
      if (!item.supplyId) return;

      if (!allowed.has(item.supplyId)) {
        ctx.addIssue({
          code: "custom",
          message: "Ese insumo ya no está disponible en tu catálogo.",
          path: ["recipe", index, "supplyId"],
        });
        return;
      }

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
}

// Single source of truth: types are inferred from the schema, no hand-written
// interface to keep in sync.
export type ProductFormValues = z.infer<typeof productFormObjectSchema>;

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
