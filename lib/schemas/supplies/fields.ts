import { z } from "zod";

// Field rules for the supply catalog domain: the business rules and user-facing
// messages, shared by the form contract (./supplies.ts) and
// lib/db/supplies/validation.ts. Pure and client-safe: no db imports.
//
// Every rule declares its message in Spanish, so Zod's internal English never
// reaches the form.

export const supplyNameField = z
  .string({ error: "Escribí el nombre del insumo." })
  .trim()
  .min(1, { error: "Escribí el nombre del insumo." })
  .max(200, { error: "El nombre del insumo debe tener como máximo 200 caracteres." });

// The amount is a decimal string, never a float, so no money rule leaks into
// the domain and no cent is lost on the way in.
const amountShape = /^-?\d+(\.\d+)?$/;

export const purchasePriceField = z
  .string({ error: "El importe debe ser un número." })
  .trim()
  .pipe(z.string().min(1, { error: "El importe es obligatorio." }))
  .pipe(
    z.string().regex(amountShape, {
      error: "El importe debe ser un número.",
    }),
  )
  .pipe(
    z.string().refine((v) => !v.startsWith("-"), {
      error: "El importe no puede ser negativo.",
    }),
  )
  .pipe(
    z.string().refine((v) => v.split(".")[0].length <= 10, {
      error: "El importe es demasiado grande.",
    }),
  )
  .pipe(
    z.string().regex(/^\d+(\.\d{1,2})?$/, {
      error: "El importe debe tener hasta 2 decimales.",
    }),
  );
