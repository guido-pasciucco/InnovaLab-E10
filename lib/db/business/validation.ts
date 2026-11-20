import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { businessNameField, businessTypeField } from "@/lib/schemas/business/fields";
import { productNameField } from "@/lib/schemas/calculator-setup/fields";
import {
  recipeQuantityField,
  recipeSupplyIdField,
  recipeUnitField,
} from "@/lib/schemas/products/fields";
import { recipeYieldField } from "@/lib/schemas/recipe-yield/fields";
import { quantityString } from "../formats";
import { businesses, productIngredients, products } from "./table";

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
}).omit({
  id: true,
  businessId: true,
  createdAt: true,
  updatedAt: true,
});

export const productIngredientInputSchema = z.object({
  supplyId: recipeSupplyIdField,
  quantity: recipeQuantityField,
  unit: recipeUnitField,
});

export const saveProductInputSchema = z
  .object({
    name: productNameField,
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

// --- Inferred input/row types: single source of truth, no manual interfaces. ---

export type BusinessRow = z.infer<typeof businessRowSchema>;
export type ProductRow = z.infer<typeof productRowSchema>;
export type ProductIngredientRow = z.infer<typeof productIngredientRowSchema>;

export type CreateBusinessInput = z.infer<typeof createBusinessInputSchema>;
export type CreateProductInput = z.infer<typeof createProductInputSchema>;
export type SaveProductInput = z.infer<typeof saveProductInputSchema>;
