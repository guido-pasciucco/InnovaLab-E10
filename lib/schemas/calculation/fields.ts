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
