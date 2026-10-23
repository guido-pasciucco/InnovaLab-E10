import { z } from "zod";

// Field rules for the cost domain: the single origin of every validation rule
// and user-facing message. The form contract (./costs.ts) and
// lib/db/costs/validation.ts reuse these atoms instead of redefining them.
// Pure and client-safe: no db imports.
//
// This file is the reconciliation of two PRs that wrote it (see #156):
//   - #146 (BUG-010): every rule declares its message in Spanish, so Zod's
//     internal English never reaches the form.
//   - #150 (#76): the cost dimensions are independent, the amount is a
//     validated decimal string, and the amount carries its own four messages.
// Keeping both means a rule here states the rule *and* the message, once.
//
// BUG-010: the concept rule used to live in lib/db/formats.ts as
// `nameString`/`codeString`, which declared no `error:` and so let Zod's
// internal English message travel to the form through `toAppError` →
// `field-errors.ts` → `setError`.

export const conceptField = z
  .string({ error: "Escribí el concepto del costo." })
  .trim()
  .min(1, { error: "Escribí el concepto del costo." })
  .max(200, { error: "El concepto del costo debe tener como máximo 200 caracteres." });

// The amount is a decimal string, never a float, so no money rule leaks into
// the domain and no cent is lost on the way in. The four messages are the
// ones the cost form shows, in the order the user can act on them: empty,
// not a number, negative, too many decimals.
//
// The digit bound mirrors the column: `amount`/`amount_period` are
// numeric(12,2), which holds 10 integer digits (BUG-004). Without it a longer
// value passes validation and fails in Postgres with a 500 instead of a field
// error.
export const amountField = z
  .string({ error: "El importe debe ser un número." })
  .trim()
  .pipe(z.string().min(1, { error: "El importe es obligatorio." }))
  .pipe(
    z.string().regex(/^-?\d{1,10}(\.\d+)?$/, {
      error: "El importe debe ser un número.",
    }),
  )
  .pipe(
    z.string().refine((v) => !v.startsWith("-"), {
      error: "El importe no puede ser negativo.",
    }),
  )
  .pipe(
    z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, {
      error: "El importe debe tener hasta 2 decimales.",
    }),
  );

// Independent dimensions: the user answers each one separately (decision
// confirmed 2026-10-17). No refinements cross these dimensions.
//
// These were free text in #146, with a TODO to close them here. Now that they
// are enums the messages can honestly say "elegí", because the field really
// does restrict the answer.
export const behaviorField = z.enum(["fixed", "variable"], {
  error: "Elegí cómo se comporta el costo: fijo o variable.",
});

export const traceabilityField = z.enum(["direct", "indirect"], {
  error: "Elegí cómo se relaciona el costo con el producto: directo o indirecto.",
});

export const isOwnLaborField = z.boolean({
  error: "Indicá si el costo es trabajo propio.",
});