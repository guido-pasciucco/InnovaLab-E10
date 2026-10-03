import { z } from "zod";

export const costCategorySchema = z.enum(["fixed", "variable", "own_labor", "indirect"]);

const MSG_EMPTY = "El importe es obligatorio.";
const MSG_NOT_NUMERIC = "El importe debe ser un número.";
const MSG_NEGATIVE = "El importe no puede ser negativo.";

const numericAmount = /^[+-]?\d+(?:\.\d+)?$/;

const amountRawSchema = z
  .string()
  .trim()
  .pipe(z.string().min(1, { error: MSG_EMPTY }))
  .pipe(z.string().regex(numericAmount, { error: MSG_NOT_NUMERIC }))
  .transform(Number)
  .pipe(z.number().min(0, { error: MSG_NEGATIVE }));

export const costConceptSchema = z
  .object({
    concept: z.string(),
    amountRaw: amountRawSchema,
    category: costCategorySchema,
  })
  .transform(({ concept, amountRaw, category }) => ({
    concept,
    amount: amountRaw,
    category,
  }));

export type CostCategory = z.infer<typeof costCategorySchema>;
export type CostLineInput = z.input<typeof costConceptSchema>;
export type CostLine = z.output<typeof costConceptSchema>;
