import { z } from "zod";

import {
  getSupplyUnit,
  resolveSupplyFamily,
  type SupplyUnitFamily,
} from "@/lib/schemas/supplies/units";
import {
  PACKAGING_DUPLICATE_MESSAGE,
  PACKAGING_UNIT_FAMILY_MESSAGE,
  packagingSupplyField,
  presentationNameField,
  recipeQuantityField,
  recipeUnitField,
} from "@/lib/schemas/products/fields";
import type { ProductItem } from "@/lib/schemas/products/products";

// Form contract for a product presentation (P12, #298). The server validates
// with lib/db/business/validation.ts; both compose the rules of
// lib/schemas/products/fields.ts. Units stay a string here because the input
// is a text field; the server rule turns it into a whole number.

export const PRESENTATION_UNITS_FORM_MESSAGE =
  "Ingresá un número entero de unidades, mayor que 0.";

export const presentationPackagingFormSchema = z.object({
  supplyId: packagingSupplyField,
  quantity: recipeQuantityField,
  unit: recipeUnitField,
});

export type PackagingOption = {
  id: string;
  name: string;
  family: SupplyUnitFamily | null;
  defaultUnit: string;
};

// Builds the form schema against the current packaging catalog, so a deleted
// packaging or a unit of another family fails before saving.
export function createPresentationFormSchema(options: readonly PackagingOption[]) {
  const byId = new Map(options.map((option) => [option.id, option]));

  return z
    .object({
      name: presentationNameField,
      unitsPerPresentation: z
        .string({ error: PRESENTATION_UNITS_FORM_MESSAGE })
        .trim()
        .regex(/^[1-9]\d{0,5}$/, { error: PRESENTATION_UNITS_FORM_MESSAGE }),
      packaging: z.array(presentationPackagingFormSchema),
    })
    .superRefine((value, ctx) => {
      const seen = new Set<string>();

      value.packaging.forEach((item, index) => {
        const option = byId.get(item.supplyId);
        if (!option) {
          ctx.addIssue({
            code: "custom",
            message: "Elegí un packaging de tu catálogo.",
            path: ["packaging", index, "supplyId"],
          });
        } else if (getSupplyUnit(item.unit)?.family !== option.family) {
          ctx.addIssue({
            code: "custom",
            message: PACKAGING_UNIT_FAMILY_MESSAGE,
            path: ["packaging", index, "unit"],
          });
        }

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
}

export type PresentationFormValues = z.input<ReturnType<typeof createPresentationFormSchema>>;

// Only packaging rows can go in a presentation; insumos belong to the recipe.
export function toPackagingOptions(
  supplies: readonly {
    id: string;
    name: string;
    kind: string;
    purchaseUnit: string;
    minimumUnit: string;
  }[],
): PackagingOption[] {
  return supplies
    .filter((supply) => supply.kind === "packaging")
    .map((supply) => ({
      id: supply.id,
      name: supply.name,
      family: resolveSupplyFamily(supply.purchaseUnit, supply.minimumUnit),
      defaultUnit: getSupplyUnit(supply.minimumUnit)?.value ?? supply.minimumUnit,
    }));
}

export type PresentationPackagingItem = {
  supplyId: string;
  supplyName: string;
  quantity: string;
  unit: string;
};

export type PresentationItem = {
  id: string;
  name: string;
  unitsPerPresentation: string;
  packaging: PresentationPackagingItem[];
};

// Everything the P12 view needs: the product with its live cost (presentations
// included) and the packaging lines whose catalog price is still zero.
export type ProductPresentationsView = {
  product: ProductItem;
  presentations: PresentationItem[];
  packagingWithoutPrice: string[];
};
