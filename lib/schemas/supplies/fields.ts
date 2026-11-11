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

// The catalog stores insumos and packaging in the same table: `kind` is the
// only difference, so the form can switch tabs without a second contract.
export const SUPPLY_KINDS = ["supply", "packaging"] as const;
export type SupplyKind = (typeof SUPPLY_KINDS)[number];

export const supplyKindField = z.enum(["supply", "packaging"], {
  error: "Elegí si es un insumo o packaging.",
});

export const purchaseUnitField = z
  .string({ error: "Escribí la unidad de compra (ej: kg, caja, docena)." })
  .trim()
  .min(1, { error: "Escribí la unidad de compra (ej: kg, caja, docena)." })
  .max(40, { error: "La unidad de compra debe tener como máximo 40 caracteres." });

export const minimumUnitField = z
  .string({ error: "Escribí la unidad mínima (ej: g, ml, unidad)." })
  .trim()
  .min(1, { error: "Escribí la unidad mínima (ej: g, ml, unidad)." })
  .max(40, { error: "La unidad mínima debe tener como máximo 40 caracteres." });

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

// How much was bought, in the purchase unit ("25" for 25 kg). Same staged
// pipeline as the amount: one actionable message per invalid input. The engine
// divides by this value, so zero and negatives share one message.
export const purchaseQuantityField = z
  .string({ error: "La cantidad debe ser un número." })
  .trim()
  .pipe(z.string().min(1, { error: "La cantidad es obligatoria." }))
  .pipe(
    z.string().regex(amountShape, {
      error: "La cantidad debe ser un número.",
    }),
  )
  .pipe(
    z.string().refine((v) => !v.startsWith("-") && /[1-9]/.test(v), {
      error: "La cantidad debe ser mayor que cero.",
    }),
  )
  .pipe(
    z.string().refine((v) => v.split(".")[0].length <= 10, {
      error: "La cantidad es demasiado grande.",
    }),
  )
  .pipe(
    z.string().regex(/^\d+(\.\d{1,4})?$/, {
      error: "La cantidad debe tener hasta 4 decimales.",
    }),
  );

// How many minimum units one purchase unit contains: 1000 for kg→g, 12 for
// docena→unidad, 100 for a 100-unit box. The form suggests it for the common
// metric pairs; the user can always override it.
export const conversionFactorField = z
  .string({ error: "La equivalencia debe ser un número." })
  .trim()
  .pipe(
    z.string().min(1, {
      error: "Indicá cuántas unidades mínimas trae la unidad de compra.",
    }),
  )
  .pipe(
    z.string().regex(amountShape, {
      error: "La equivalencia debe ser un número.",
    }),
  )
  .pipe(
    z.string().refine((v) => !v.startsWith("-") && /[1-9]/.test(v), {
      error: "La equivalencia debe ser mayor que cero.",
    }),
  )
  .pipe(
    z.string().refine((v) => v.split(".")[0].length <= 10, {
      error: "La equivalencia es demasiado grande.",
    }),
  )
  .pipe(
    z.string().regex(/^\d+(\.\d{1,4})?$/, {
      error: "La equivalencia debe tener hasta 4 decimales.",
    }),
  );
