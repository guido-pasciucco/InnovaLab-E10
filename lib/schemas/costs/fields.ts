import { z } from "zod";

// Field rules for the cost domain: the business rules and user-facing
// messages, shared by the form contract (./costs.ts) and
// lib/db/costs/validation.ts. Pure and client-safe: no db imports.
//
// This file is the reconciliation of two PRs that wrote it (see #156):
//   - #146 (BUG-010): every rule declares its message in Spanish, so Zod's
//     internal English never reaches the form.
//   - #150 (#76): the cost dimensions are independent, the amount is a
//     validated decimal string, and the amount carries its own messages.
// Keeping both means a rule here states the rule *and* the message, once.
//
// Not every rule in the domain lives here: `notes` (and any column-level
// constraint that is not a business rule) stays in the db layer. What this
// file guarantees is that any rule exposed to the user — form or server —
// carries its Spanish message.

export const conceptField = z
  .string({ error: "Escribí el concepto del costo." })
  .trim()
  .min(1, { error: "Escribí el concepto del costo." })
  .max(200, { error: "El concepto del costo debe tener como máximo 200 caracteres." });

// The amount is a decimal string, never a float, so no money rule leaks into
// the domain and no cent is lost on the way in. Each stage of the pipeline
// exposes exactly one message, so the user always sees the single most
// actionable error; the tests in costs.test.ts assert each stage's message.
//
// Shape and size are separate checks: the regex only decides whether the
// string looks like a number, and a separate refine decides whether it fits
// the column. Mixing them would make an 11-digit amount say "no es un
// número" instead of "demasiado grande".
//
// We use four `.pipe()` stages instead of one regex so each invalid input
// exposes exactly one actionable message (empty, not a number, negative,
// too many decimals, too large). The pipeline order is intentional: each
// stage only runs when the previous one passed, so the user never sees two
// conflicting errors for the same value. The tests in costs.test.ts assert
// each stage's message individually.
//
// The integer-digit bound mirrors the column: `amount`/`amount_period` are
// numeric(12,2), which holds 10 integer digits (BUG-004). Without it a longer
// value passes validation and fails in Postgres with a 500 instead of a field
// error.
const amountShape = /^-?\d+(\.\d+)?$/;

export const amountField = z
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

// Hours of own labor for the month (paso 4). Same pipeline as `amountField`
// with the messages worded for hours, so the user never reads "importe" under
// an hours input. It keeps the amount's bounds (>= 0, 10 integer digits,
// 2 decimals): the product with the hourly rate must still fit numeric(12,2).
export const hoursField = z
  .string({ error: "Las horas deben ser un número." })
  .trim()
  .pipe(z.string().min(1, { error: "Las horas son obligatorias." }))
  .pipe(
    z.string().regex(amountShape, {
      error: "Las horas deben ser un número.",
    }),
  )
  .pipe(
    z.string().refine((v) => !v.startsWith("-"), {
      error: "Las horas no pueden ser negativas.",
    }),
  )
  .pipe(
    z.string().refine((v) => v.split(".")[0].length <= 10, {
      error: "Las horas son demasiado grandes.",
    }),
  )
  .pipe(
    z.string().regex(/^\d+(\.\d{1,2})?$/, {
      error: "Las horas deben tener hasta 2 decimales.",
    }),
  );

// Product units one purchase of a variable cost yields (paso 3): a roll that
// yields 20 boxes is "20". Same staged pipeline as `amountField`, bounded by
// the yield_quantity column, numeric(14,4): 10 integer digits, 4 decimals.
// Zero and negatives share one message: the engine divides by this value.
export const yieldField = z
  .string({ error: "El rendimiento debe ser un número." })
  .trim()
  .pipe(z.string().min(1, { error: "Indicá para cuántas unidades rinde." }))
  .pipe(
    z.string().regex(amountShape, {
      error: "El rendimiento debe ser un número.",
    }),
  )
  .pipe(
    z.string().refine((v) => !v.startsWith("-") && /[1-9]/.test(v), {
      error: "El rendimiento debe ser mayor que cero.",
    }),
  )
  .pipe(
    z.string().refine((v) => v.split(".")[0].length <= 10, {
      error: "El rendimiento es demasiado grande.",
    }),
  )
  .pipe(
    z.string().regex(/^\d+(\.\d{1,4})?$/, {
      error: "El rendimiento debe tener hasta 4 decimales.",
    }),
  );

// Independent dimensions: the user answers each one separately (decision
// confirmed 2026-10-17). No refinements cross these dimensions.
//
// These were free text in #146, with a TODO to close them here. Now that they
// are enums the messages can honestly say "elegí", because the field really
// does restrict the answer.
//
// Single owner of the closed vocabulary. The calc engine imports these lists
// instead of restating them. The field schemas below keep their own literals.
export const COST_BEHAVIORS = ["fixed", "variable"] as const;
export type CostBehavior = (typeof COST_BEHAVIORS)[number];

export const COST_TRACEABILITIES = ["direct", "indirect"] as const;
export type CostTraceability = (typeof COST_TRACEABILITIES)[number];

export const behaviorField = z.enum(["fixed", "variable"], {
  error: "Elegí cómo se comporta el costo: fijo o variable.",
});

export const traceabilityField = z.enum(["direct", "indirect"], {
  error: "Elegí cómo se relaciona el costo con el producto: directo o indirecto.",
});

export const isOwnLaborField = z.boolean({
  error: "Indicá si el costo es trabajo propio.",
});

// Month the period expenses belong to (#243), as "YYYY-MM". The calculator is
// monthly (see periodField in calculator-setup/fields.ts), so a month key is
// enough and keeps the card free of timezone-dependent dates. The server
// defaults it to the current month in Argentina when the caller omits it.
export const costPeriodField = z
  .string({ error: "Indicá el período del gasto." })
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
    error: "El período debe tener el formato AAAA-MM.",
  });
