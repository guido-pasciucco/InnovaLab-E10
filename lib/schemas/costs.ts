import { z } from "zod";

export const costCategorySchema = z.enum(["fixed", "variable", "own_labor", "indirect"]);

const numericAmount = /^[+-]?\d+(?:\.\d+)?$/;

const amountRawSchema = z
  .string()
  .trim()
  .pipe(z.string().min(1, { error: "El importe es obligatorio." }))
  .pipe(z.string().regex(numericAmount, { error: "El importe debe ser un número." }))
  .transform(Number)
  .pipe(z.number().min(0, { error: "El importe no puede ser negativo." }));

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
