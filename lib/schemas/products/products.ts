import { z } from "zod";

import { productNameField } from "@/lib/schemas/calculator-setup/fields";
import {
  canonicalSupplyUnit,
  getSupplyUnit,
  resolveSupplyFamily,
  type SupplyUnitFamily,
} from "@/lib/schemas/supplies/units";
import {
  monthlyCapacityField,
  recipeQuantityField,
  recipeSupplyField,
  recipeUnitField,
  RECIPE_UNIT_FAMILY_MESSAGE,
} from "./fields";

// Form contract (client only): RHF validates with it before submitting. The
// server validates with lib/db/business/validation.ts; both contracts compose
// the same field rules from ./fields.ts (and productNameField).
//
// Scope of issue #240 was name + recipe; #269 added the monthly capacity as one
// more editable field. Purchase unit and unit cost still stay out of this story.
//
// The recipe only accepts supplies that are available in the current catalog:
// the form builds the schema with `createProductFormSchema(supplies)`, so
// packaging rows, deleted ids and units from another family are rejected
// before saving.

export const recipeItemSchema = z.object({
  supplyId: recipeSupplyField,
  quantity: recipeQuantityField,
  unit: recipeUnitField,
});

const productFormObjectSchema = z.object({
  name: productNameField,
  monthlyCapacity: monthlyCapacityField,
  recipe: z
    .array(recipeItemSchema)
    .min(1, { error: "Agregá al menos un insumo a la receta." }),
});

// Image of the recipe selector: only insumos are ingredients, packaging never
// is. Filtering here (instead of in the page) keeps the regression covered by
// a pure unit test and gives the page a single mapping function.
//
// The default unit is the supply's minimum unit, which is also the unit of the
// migrated recipe rows. Users can switch to any other catalog unit in the same
// family (for example g → kg) and the service converts for costing.
export function toRecipeSupplyOptions(
  supplies: readonly {
    id: string;
    name: string;
    kind: string;
    purchaseUnit: string;
    minimumUnit: string;
  }[],
): RecipeSupplyOption[] {
  return supplies
    .filter((supply) => supply.kind === "supply")
    .map((supply) => ({
      id: supply.id,
      name: supply.name,
      family: resolveSupplyFamily(supply.purchaseUnit, supply.minimumUnit),
      defaultUnit: canonicalSupplyUnit(supply.minimumUnit || supply.purchaseUnit),
      minimumUnit: supply.minimumUnit,
    }));
}

// The form owns the catalog snapshot, so validation can reject ids that are no
// longer available (deleted, or packaging), detect duplicates, and keep each
// line inside the selected supply's unit family.
export function createProductFormSchema(
  supplies: readonly RecipeSupplyOption[],
) {
  const available = new Map(supplies.map((supply) => [supply.id, supply]));

  return productFormObjectSchema.superRefine((value, ctx) => {
    const seen = new Set<string>();

    value.recipe.forEach((item, index) => {
      // An empty select is already reported as required; do not add a
      // duplicate error on top of it.
      if (!item.supplyId) return;

      const supply = available.get(item.supplyId);

      if (!supply) {
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

      // The unit rule already reports empty or overlong values.
      if (!item.unit || item.unit.length > 40) return;

      const catalogUnit = getSupplyUnit(item.unit);
      const keepsLegacyUnit =
        catalogUnit === null &&
        supply.family === null &&
        item.unit === supply.defaultUnit;

      if (!catalogUnit && !keepsLegacyUnit) {
        ctx.addIssue({
          code: "custom",
          message: RECIPE_UNIT_FAMILY_MESSAGE,
          path: ["recipe", index, "unit"],
        });
        return;
      }

      if (catalogUnit && supply.family !== catalogUnit.family) {
        ctx.addIssue({
          code: "custom",
          message: RECIPE_UNIT_FAMILY_MESSAGE,
          path: ["recipe", index, "unit"],
        });
      }
    });
  });
}

// Single source of truth: types are inferred from the schema, no hand-written
// interface to keep in sync. The form type is the input side because the
// capacity travels as text while the user types; the server rule parses it.
export type ProductFormValues = z.input<typeof productFormObjectSchema>;

// Shape the client needs to list, edit and show a saved recipe. The supply
// name is a snapshot for the UI, filled by the service join.
export type ProductRecipeItem = {
  supplyId: string;
  supplyName: string;
  quantity: string;
  unit: string;
};

export type ProductItem = {
  id: string;
  name: string;
  monthlyCapacity: number | null;
  recipe: ProductRecipeItem[];
};

// Minimal shape the recipe selector needs from the supply catalog.
export type RecipeSupplyOption = {
  id: string;
  name: string;
  family: SupplyUnitFamily | null;
  defaultUnit: string;
  minimumUnit: string;
};
