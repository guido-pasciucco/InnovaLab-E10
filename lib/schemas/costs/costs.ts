import { z } from "zod";

import { amountField, conceptField } from "./fields";

export const costCategorySchema = z.enum(["fixed", "variable", "own_labor", "indirect"]);

// Form contract. `amountRaw` is a validated decimal string — never a float —
// so no money rule leaks into the domain. `category` is the simple enum the
// form exposes; the DB stores it as the two axes (behavior + traceability),
// derived via categoryToAxes. This is an explicit exception to the
// "form key = column name" convention.
export const costLineSchema = z.object({
  concept: conceptField,
  amountRaw: amountField,
  category: costCategorySchema,
});

export type CostCategory = z.infer<typeof costCategorySchema>;
export type CostLineInput = z.input<typeof costLineSchema>;
export type CostLine = z.infer<typeof costLineSchema>;

// Translates the simple form category into the two DB axes.
// `own_labor` is assumed variable/direct for now.
export function categoryToAxes(category: CostCategory): { behavior: string; traceability: string } {
  switch (category) {
    case "fixed":
      return { behavior: "fixed", traceability: "direct" };
    case "variable":
      return { behavior: "variable", traceability: "direct" };
    case "own_labor":
      return { behavior: "variable", traceability: "direct" };
    case "indirect":
      return { behavior: "fixed", traceability: "indirect" };
  }
}
