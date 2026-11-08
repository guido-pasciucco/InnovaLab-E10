import { z } from "zod";

// Field rules for the calculation domain: the single origin of every
// validation rule and user-facing message for these columns. Pure and client
// safe (no db, no window), so `lib/db/calculation/validation.ts` can reuse
// them as drizzle-zod refinements without dragging Drizzle into the bundle.
//
// BUG-010: these two rules used to live in `lib/db/formats.ts` as
// `nameString`/`codeString`, which declared no `error:` and so let Zod's
// internal English message travel to the form through `toAppError` →
// `field-errors.ts` → `setError`.

export const scenarioNameField = z
  .string({ error: "Escribí el nombre del escenario." })
  .trim()
  .min(1, { error: "Escribí el nombre del escenario." })
  .max(120, { error: "El nombre del escenario debe tener como máximo 120 caracteres." });

export const marginConventionField = z
  .string({ error: "Escribí la convención de margen." })
  .trim()
  .min(1, { error: "Escribí la convención de margen." })
  .max(40, {
    error: "La convención de margen debe tener como máximo 40 caracteres.",
  });

// Margin convention persisted in `pricing_inputs.margin_convention`: the
// margin is measured on the selling price
// (docs/decisiones/establecidas/negocio/0003-el-margen-se-mide-sobre-el-precio-de-venta.md).
// Same literal the RLS tests use.
export const MARGIN_CONVENTION_ON_PRICE = "sobre_precio";

const MARGIN_SHAPE = /^-?\d+(\.\d+)?$/;

// Expected margin on the selling price, in percent, as a decimal string ("30"
// is 30 %). 100 % or more has no valid price (price = cost / (1 - margin)), so
// the user is asked to change it. Up to 4 decimals, the scale of
// `pricing_inputs.expected_margin_pct` (numeric(14,4)).
export const expectedMarginField = z
  .string({ error: "Escribí el margen que querés ganar." })
  .trim()
  .pipe(z.string().min(1, { error: "Escribí el margen que querés ganar." }))
  .pipe(z.string().regex(MARGIN_SHAPE, { error: "El margen debe ser un número." }))
  .pipe(
    z.string().refine((v) => !v.startsWith("-"), {
      error: "El margen no puede ser negativo.",
    }),
  )
  .pipe(
    z.string().refine((v) => v.split(".")[0].replace(/^0+(?=\d)/, "").length <= 2, {
      error: "El margen tiene que ser menor que 100 %.",
    }),
  )
  .pipe(
    z.string().regex(/^\d+(\.\d{1,4})?$/, {
      error: "El margen debe tener hasta 4 decimales.",
    }),
  );
