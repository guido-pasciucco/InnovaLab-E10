import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { businessNameField, businessTypeField } from "@/lib/schemas/business/fields";
import { productNameField } from "@/lib/schemas/calculator-setup/fields";
import {
  monthlyCapacityField,
  PACKAGING_DUPLICATE_MESSAGE,
  packagingSupplyIdField,
  presentationNameField,
  presentationUnitsField,
  recipeQuantityField,
  recipeSupplyIdField,
  recipeUnitField,
} from "@/lib/schemas/products/fields";
import { markupPercentField } from "@/lib/schemas/pricing/fields";
import { recipeYieldField } from "@/lib/schemas/recipe-yield/fields";
import { quantityString } from "../formats";
import {
  businesses,
  presentationPackaging,
  presentations,
  productIngredients,
  products,
} from "./table";

// ---------------------------------------------------------------------------
// Zod schemas derived from the Drizzle tables (server-side persistence, ADR 02).
// Rule: the client sends a public input (no ids, no server-owned FKs, no
// timestamps). The server injects server-controlled fields (ownerUserId from
// the session, businessId/calculationId from the route, ids/timestamps from
// the database) before insert.
// ---------------------------------------------------------------------------

// --- Persisted rows: mirror exactly what comes back from the database. ---

export const businessRowSchema = createSelectSchema(businesses);

export const productRowSchema = createSelectSchema(products);

export const productIngredientRowSchema = createSelectSchema(
  productIngredients,
  { quantity: quantityString },
);

export const presentationRowSchema = createSelectSchema(presentations, {
  unitsPerPresentation: quantityString,
});

export const presentationPackagingRowSchema = createSelectSchema(
  presentationPackaging,
  { quantity: quantityString },
);

// --- Public inputs: insert schema minus every server-controlled field. ---

export const createBusinessInputSchema = createInsertSchema(businesses, {
  name: businessNameField,
  businessType: businessTypeField.nullish(),
}).omit({
  id: true,
  ownerUserId: true,
  createdAt: true,
});

export const createProductInputSchema = createInsertSchema(products, {
  name: productNameField,
  skuOrSlug: z.string().trim().min(1).max(120).nullish(),
  monthlyCapacity: monthlyCapacityField,
}).omit({
  id: true,
  businessId: true,
  variableCostStatus: true,
  variableCostUnitAmount: true,
  variableCostUnitNumerator: true,
  variableCostUnitDenominator: true,
  variableCostRecipeAmount: true,
  variableCostRecipeNumerator: true,
  variableCostRecipeDenominator: true,
  variableCostUnavailableCode: true,
  variableCostCalculatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const productIngredientInputSchema = z.object({
  supplyId: recipeSupplyIdField,
  quantity: recipeQuantityField,
  unit: recipeUnitField,
});

export const createPresentationInputSchema = createInsertSchema(presentations, {
  name: presentationNameField,
  unitsPerPresentation: presentationUnitsField,
}).omit({
  id: true,
  productId: true,
  createdAt: true,
  updatedAt: true,
});

export const presentationPackagingInputSchema = z.object({
  supplyId: packagingSupplyIdField,
  quantity: recipeQuantityField,
  unit: recipeUnitField,
});

// One row per packaging in a presentation: the form rejects duplicates and the
// unique index enforces the same rule under concurrency.
export const savePresentationInputSchema = createPresentationInputSchema
  .extend({ packaging: z.array(presentationPackagingInputSchema) })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();

    value.packaging.forEach((item, index) => {
      if (seen.has(item.supplyId)) {
        ctx.addIssue({
          code: "custom",
          message: PACKAGING_DUPLICATE_MESSAGE,
          path: ["packaging", index, "supplyId"],
        });
      }

      seen.add(item.supplyId);
    });
  });

export const saveProductInputSchema = z
  .object({
    name: productNameField,
    monthlyCapacity: monthlyCapacityField,
    yieldQuantity: recipeYieldField,
    recipe: z
      .array(productIngredientInputSchema)
      .min(1, { error: "Agregá al menos un insumo a la receta." }),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();

    value.recipe.forEach((item, index) => {
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

// Markup writes (#312). These are single-field inputs composed from the shared
// rule in lib/schemas/pricing/fields.ts, so the form and the server enforce the
// exact same message. `null` is the explicit "clear the own markup" command:
// the product goes back to using the business default. It is not the same as
// omitting the field, which is rejected.
export const setDefaultMarkupInputSchema = z.object({
  defaultMarkupPercent: markupPercentField.nullable(),
});

export const setProductMarkupInputSchema = z.object({
  markupPercent: markupPercentField.nullable(),
});

// --- Inferred input/row types: single source of truth, no manual interfaces. ---

export type BusinessRow = z.infer<typeof businessRowSchema>;
export type ProductRow = z.infer<typeof productRowSchema>;
export type ProductIngredientRow = z.infer<typeof productIngredientRowSchema>;
export type PresentationRow = z.infer<typeof presentationRowSchema>;
export type PresentationPackagingRow = z.infer<
  typeof presentationPackagingRowSchema
>;

export type CreateBusinessInput = z.infer<typeof createBusinessInputSchema>;
export type CreateProductInput = z.infer<typeof createProductInputSchema>;
export type SaveProductInput = z.infer<typeof saveProductInputSchema>;
export type CreatePresentationInput = z.infer<typeof createPresentationInputSchema>;
export type PresentationPackagingInput = z.infer<
  typeof presentationPackagingInputSchema
>;
export type SavePresentationInput = z.infer<typeof savePresentationInputSchema>;
export type SetDefaultMarkupInput = z.infer<typeof setDefaultMarkupInputSchema>;
export type SetProductMarkupInput = z.infer<typeof setProductMarkupInputSchema>;
