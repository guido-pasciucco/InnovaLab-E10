import { createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { calcClosures } from "./table";

// Persisted rows. There is no public input schema on purpose: a closure is
// built entirely by the server from the user's own catalog and the current
// period, so the client cannot choose its contents or its version.
export const calcClosureRowSchema = createSelectSchema(calcClosures);

export type CalcClosureRow = z.infer<typeof calcClosureRowSchema>;

// The jsonb photo is read years later by the history view. Unknown fields are
// ignored (zod strips them): the guard only proves the fields this app reads
// are present with the expected primitive types, so a corrupt or foreign
// snapshot degrades into a domain error instead of a TypeError at render time.
const recipeItem = z.object({
  supplyId: z.string(),
  supplyName: z.string(),
  quantity: z.string(),
  unit: z.string(),
});

export const closureSnapshotSchema = z.object({
  period: z.string(),
  inputs: z.object({
    defaultMarkupPercent: z.string().nullable(),
    supplies: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        kind: z.enum(["supply", "packaging"]),
        unit: z.string(),
        price: z.string(),
      }),
    ),
    products: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        recipe: z.array(recipeItem),
        yieldQuantity: z.string().nullable(),
        monthlyCapacity: z.number().nullable(),
        ownMarkupPercent: z.string().nullable(),
        presentations: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            unitsPerPresentation: z.string(),
            ownMarkupPercent: z.string().nullable().optional(),
            packaging: z.array(recipeItem),
          }),
        ),
      }),
    ),
    periodCostLines: z.array(
      z.object({ id: z.string(), concept: z.string(), amountPeriod: z.string() }),
    ),
  }),
  results: z.object({
    costDistribution: z.object({
      totalExpenses: z.string(),
      rows: z.array(
        z.object({
          rowId: z.string(),
          productId: z.string(),
          name: z.string(),
          variableUnit: z.string(),
          indirectUnit: z.string(),
          unitCost: z.string(),
        }),
      ),
    }),
    pricing: z.object({
      defaultMarkupPercent: z.string().nullable(),
      rows: z.array(
        z.object({
          rowId: z.string(),
          productId: z.string(),
          name: z.string(),
          price: z.string(),
          profitUnit: z.string(),
          realMarginPct: z.string(),
          ownMarkupPercent: z.string().nullable(),
        }),
      ),
    }),
    breakEven: z.object({
      rows: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          breakEvenUnitsWhole: z.string(),
        }),
      ),
      totals: z
        .object({
          breakEvenUnitsWhole: z.string(),
          breakEvenSales: z.string().nullable(),
        })
        .nullable(),
    }),
  }),
});
