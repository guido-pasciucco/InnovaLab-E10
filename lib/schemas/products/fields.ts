import { z } from "zod";

// Field rules for the product + recipe contract (issue #240). The name rule is
// already owned by the calculator setup contract, so it is reused instead of
// restated. The quantity rule belongs here and is proposed for backend to
// mirror in lib/db/products/validation.ts when persistence lands.
//
// Pure and client-safe: no db imports. Messages are in Spanish so Zod's
// internal English never reaches the form.

export const recipeSupplyField = z
  .string({ error: "Elegí un insumo de tu catálogo." })
  .trim()
  .min(1, { error: "Elegí un insumo de tu catálogo." });

// Quantity is a decimal string, never a float: the recipe stores proportions
// (grams, millilitres, units) and the future cost engine needs exact values.
// The pipeline exposes one actionable message at a time.
const quantityShape = /^-?\d+(\.\d+)?$/;

export const recipeQuantityField = z
  .string({ error: "La cantidad debe ser un número." })
  .trim()
  .pipe(z.string().min(1, { error: "Indicá la cantidad del insumo." }))
  .pipe(
    z.string().regex(quantityShape, {
      error: "La cantidad debe ser un número.",
    }),
  )
  .pipe(
    z.string().refine((v) => !v.startsWith("-") && /[1-9]/.test(v), {
      error: "La cantidad debe ser mayor que 0.",
    }),
  )
  .pipe(
    z.string().refine((v) => v.split(".")[0].length <= 10, {
      error: "La cantidad es demasiado grande.",
    }),
  )
  .pipe(
    z.string().regex(/^\d+(\.\d{1,3})?$/, {
      error: "La cantidad debe tener hasta 3 decimales.",
    }),
  );
