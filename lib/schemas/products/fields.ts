import { z } from "zod";

// Field rules for the product + recipe contract (issue #240). The name rule is
// already owned by the calculator setup contract, so it is reused instead of
// restated. The quantity rule belongs here and is proposed for backend to
// mirror in lib/db/products/validation.ts when persistence lands.
//
// Pure and client-safe: no db imports. Messages are in Spanish so Zod's
// internal English never reaches the form.

// Capacity is optional ("empty" means NULL, not 0) but, when typed, it must be
// a whole number of units. The form sends text and the server may receive a
// number, so the rule normalizes both before checking. Decimal and negative
// values share one actionable message.
export const MONTHLY_CAPACITY_INVALID_MESSAGE =
  "Ingresá un número entero de unidades, 0 o mayor.";

// Cap for the `integer` column: anything bigger would pass Zod and die in
// Postgres with a 500 instead of a field error.
const MONTHLY_CAPACITY_MAX = 2_147_483_647;

function toMonthlyCapacity(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") return value;

  const trimmed = value.trim();

  if (trimmed === "") return null;

  // Only digits: rejects "2.5", "-5", "abc" and exponent notation before the
  // numeric checks below can see a rounded value.
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

export const monthlyCapacityField = z
  .union([z.string(), z.number(), z.null()], {
    error: MONTHLY_CAPACITY_INVALID_MESSAGE,
  })
  .optional()
  .transform(toMonthlyCapacity)
  .pipe(
    z
      .number({ error: MONTHLY_CAPACITY_INVALID_MESSAGE })
      .int({ error: MONTHLY_CAPACITY_INVALID_MESSAGE })
      .min(0, { error: MONTHLY_CAPACITY_INVALID_MESSAGE })
      .max(MONTHLY_CAPACITY_MAX, { error: MONTHLY_CAPACITY_INVALID_MESSAGE })
      .nullable(),
  );

export const recipeSupplyField = z
  .string({ error: "Elegí un insumo de tu catálogo." })
  .trim()
  .min(1, { error: "Elegí un insumo de tu catálogo." });

// Server-side rule for the persisted recipe line: the form selects a supply id
// from the catalog, so the value that reaches the service must be a UUID. The
// form keeps `recipeSupplyField` because its tests and the selector work with
// catalog ids as plain strings.
export const recipeSupplyIdField = z.uuid({
  error: "Elegí un insumo de tu catálogo.",
});

// Every recipe line stores its own unit. New lines must use the catalog; a
// legacy line whose supply had a free-text minimum unit may keep that exact
// value, so the rule only requires a non-empty string here. The service checks
// the catalog family against the supply before writing.
export const RECIPE_UNIT_REQUIRED_MESSAGE = "Elegí la unidad de medida del insumo.";
export const RECIPE_UNIT_FAMILY_MESSAGE =
  "Elegí una unidad de medida de la misma familia que el insumo.";

export const recipeUnitField = z
  .string({ error: RECIPE_UNIT_REQUIRED_MESSAGE })
  .trim()
  .min(1, { error: RECIPE_UNIT_REQUIRED_MESSAGE })
  .max(40, {
    error: "La unidad de medida debe tener como máximo 40 caracteres.",
  });

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
    z.string().regex(/^\d+(\.\d{1,4})?$/, {
      error: "La cantidad debe tener hasta 4 decimales.",
    }),
  );

// Presentation rules (P12). The name is what the user sees in the catalog;
// units must be a positive whole number because the cost engine rejects
// fractional pack sizes.
export const presentationNameField = z
  .string({ error: "Escribí el nombre de la presentación." })
  .trim()
  .min(1, { error: "Escribí el nombre de la presentación." })
  .max(80, {
    error: "El nombre de la presentación debe tener como máximo 80 caracteres.",
  });

export const PRESENTATION_UNITS_INVALID_MESSAGE =
  "Ingresá un número entero de unidades, mayor que 0.";

function toPresentationUnits(value: string | number): number {
  if (typeof value === "number") return value;
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

export const presentationUnitsField = z
  .union([z.string(), z.number()], {
    error: PRESENTATION_UNITS_INVALID_MESSAGE,
  })
  .transform(toPresentationUnits)
  .pipe(
    z
      .number({ error: PRESENTATION_UNITS_INVALID_MESSAGE })
      .int({ error: PRESENTATION_UNITS_INVALID_MESSAGE })
      .positive({ error: PRESENTATION_UNITS_INVALID_MESSAGE })
      .max(1_000_000, { error: PRESENTATION_UNITS_INVALID_MESSAGE }),
  );
