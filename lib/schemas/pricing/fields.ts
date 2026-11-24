import { z } from "zod";

// Single origin of the markup rule (#312). It feeds both the form contract
// (pricing.ts) and the server validation (lib/db/business/validation.ts).
// Pure and client-safe: no db, no window, no floats.

export const MARKUP_PERCENT_REQUIRED_MESSAGE = "Cargá el recargo sobre el costo.";
export const MARKUP_PERCENT_INVALID_MESSAGE =
  "El recargo debe ser un número con hasta 2 decimales.";
export const MARKUP_PERCENT_NON_POSITIVE_MESSAGE =
  "Con un recargo de 0 o negativo el precio quedaría igual o por debajo del costo.";
export const MARKUP_PERCENT_MAX_MESSAGE = "El recargo puede ser como máximo 1000 %.";

// numeric(7,2): 5 integer digits plus 2 decimals, so 1000.00 is the cap.
const MAX_MARKUP_PERCENT = 1000;

// Decimal strings, never floats. A comma is accepted as the decimal separator,
// as in the rest of the forms ("30,5" -> "30.5"). No thousands separator: a
// dot is always the decimal separator once normalized.
export const markupPercentField = z
  .union([z.string(), z.number()], { error: MARKUP_PERCENT_REQUIRED_MESSAGE })
  .transform((value) => String(value).trim().replace(",", "."))
  .pipe(z.string().min(1, { error: MARKUP_PERCENT_REQUIRED_MESSAGE }))
  .pipe(
    z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/, { error: MARKUP_PERCENT_INVALID_MESSAGE }),
  )
  .pipe(
    z
      .string()
      .refine((value) => Number(value) > 0, { error: MARKUP_PERCENT_NON_POSITIVE_MESSAGE }),
  )
  .pipe(
    z
      .string()
      .refine((value) => Number(value) <= MAX_MARKUP_PERCENT, { error: MARKUP_PERCENT_MAX_MESSAGE }),
  );
