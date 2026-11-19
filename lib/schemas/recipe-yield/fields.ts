import { z } from "zod";

// products.yield_quantity is PostgreSQL integer, so this boundary must match
// the persisted representation rather than JavaScript's larger safe integer.
const MAX_YIELD = BigInt(2_147_483_647);
const integerShape = /^-?\d+$/;

/**
 * Finished units obtained from one recipe. It remains a string because it
 * crosses the form boundary and later feeds the exact calculation engine.
 */
export const recipeYieldField = z
  .string({ error: "Indicá cuántas unidades obtenés con esta receta." })
  .trim()
  .min(1, { error: "Indicá cuántas unidades obtenés con esta receta." })
  .pipe(z.string().regex(integerShape, {
    error: "El rendimiento debe ser un número entero.",
  }))
  .refine((value) => !integerShape.test(value) || BigInt(value) > BigInt(0), {
    error: "El rendimiento debe ser mayor que 0.",
  })
  .refine((value) => !integerShape.test(value) || BigInt(value) <= MAX_YIELD, {
    error: "El rendimiento supera el máximo permitido.",
  });
