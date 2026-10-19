import { z } from "zod";

// Field rules for the cost domain: the single origin of every validation rule
// and user-facing message for these columns. Pure and client safe (no db, no
// window), so `lib/db/costs/validation.ts` can reuse them as drizzle-zod
// refinements without dragging Drizzle into the bundle.
//
// BUG-010: these three rules used to live in `lib/db/formats.ts` as
// `nameString`/`codeString`, which declared no `error:` and so let Zod's
// internal English message travel to the form through `toAppError` →
// `field-errors.ts` → `setError`.

export const conceptField = z
  .string({ error: "Escribí el concepto del costo." })
  .trim()
  .min(1, { error: "Escribí el concepto del costo." })
  .max(200, { error: "El concepto del costo debe tener como máximo 200 caracteres." });

// TODO(#76): `behavior` is a closed set (`fixed | variable`) and `traceability`
// another (`direct | indirect`), both independent dimensions per the current
// cost model. These are still free text, so the database accepts any string
// ("banana" included) and the messages below cannot honestly say "elegí".
// Converting them to `z.enum` belongs to the cost-schema ticket that closes
// that model; BUG-010 only fixes the messages, and this ticket is explicitly
// not the place to change the type.
export const behaviorField = z
  .string({ error: "Escribí cómo se comporta el costo." })
  .trim()
  .min(1, { error: "Escribí cómo se comporta el costo." })
  .max(40, { error: "El comportamiento debe tener como máximo 40 caracteres." });

export const traceabilityField = z
  .string({ error: "Escribí cómo se relaciona el costo con el producto." })
  .trim()
  .min(1, { error: "Escribí cómo se relaciona el costo con el producto." })
  .max(40, { error: "La relación con el producto debe tener como máximo 40 caracteres." });
