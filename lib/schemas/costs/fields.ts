import { z } from "zod";

// Field rules: the single origin of every validation rule and user-facing
// message. The form contract (./costs.ts) and lib/db/<domain>/validation.ts
// reuse these atoms instead of redefining them. Pure and client-safe: no db.
export const conceptField = z
  .string()
  .trim()
  .min(1, { error: "Escribí el concepto del costo." })
  .max(200);

export const amountField = z
  .string()
  .trim()
  .pipe(z.string().min(1, { error: "El importe es obligatorio." }))
  .pipe(z.string().regex(/^-?\d+(\.\d+)?$/, { error: "El importe debe ser un número." }))
  .pipe(z.string().refine((v) => !v.startsWith("-"), { error: "El importe no puede ser negativo." }))
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, { error: "El importe debe tener hasta 2 decimales." }));
