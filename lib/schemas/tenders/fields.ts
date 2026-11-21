import { z } from "zod";

// Field rules for supply tenders (docs/licitaciones RN-02, RN-09, RN-10).
// Shared by the publish form (client-side check, per item row) and by
// lib/db/tenders/validation.ts (the server gate). Pure and client-safe.
// Every rule declares its message in Spanish.

// RN-02: "la duración de cada ronda (6, 12 o 24 hs; 6 hs por defecto) y la
// cantidad de rondas (de 2 a 5; 4 por defecto)".
export const ROUND_HOURS_OPTIONS = [6, 12, 24] as const;
export const DEFAULT_ROUND_HOURS = 6;
export const MIN_ROUND_COUNT = 2;
export const MAX_ROUND_COUNT = 5;
export const DEFAULT_ROUND_COUNT = 4;
// Upper bound for the % de baja (assumption, see decisions N-11).
export const MAX_DECREMENT_PERCENT = 50;
export const MAX_TENDER_ITEMS = 20;
export const MAX_SPECS_LENGTH = 500;

// Form inputs arrive as strings; numbers are accepted too.
const integerInput = z.union([z.string().trim(), z.number()]).transform((value) => Number(value));

export const roundHoursField = integerInput.pipe(
  z.union(ROUND_HOURS_OPTIONS.map((hours) => z.literal(hours)) as [z.ZodLiteral<6>, z.ZodLiteral<12>, z.ZodLiteral<24>], {
    error: "Elegí una duración de ronda de 6, 12 o 24 horas.",
  }),
);

export const roundCountField = integerInput.pipe(
  z
    .number({ error: `Elegí entre ${MIN_ROUND_COUNT} y ${MAX_ROUND_COUNT} rondas.` })
    .int({ error: `Elegí entre ${MIN_ROUND_COUNT} y ${MAX_ROUND_COUNT} rondas.` })
    .min(MIN_ROUND_COUNT, { error: `Elegí entre ${MIN_ROUND_COUNT} y ${MAX_ROUND_COUNT} rondas.` })
    .max(MAX_ROUND_COUNT, { error: `Elegí entre ${MIN_ROUND_COUNT} y ${MAX_ROUND_COUNT} rondas.` }),
);

// Decimal strings, never floats. Accepts a comma as decimal separator.
const decimalInput = (message: string) =>
  z
    .union([z.string(), z.number()], { error: message })
    .transform((value) => String(value).trim().replace(",", "."))
    .pipe(z.string().min(1, { error: message }));

export const decrementPercentField = decimalInput("Escribí el % de baja por ronda.").pipe(
  z
    .string()
    .regex(/^\d{1,2}(\.\d{1,2})?$/, { error: "El % de baja es un número con hasta 2 decimales." })
    .refine((value) => Number(value) > 0, { error: "El % de baja tiene que ser mayor a 0." })
    .refine((value) => Number(value) <= MAX_DECREMENT_PERCENT, {
      error: `El % de baja puede ser como máximo ${MAX_DECREMENT_PERCENT} %.`,
    }),
);

// Same bounds as the money columns: numeric(12,2).
export const unitPriceField = decimalInput("Escribí el precio.").pipe(
  z
    .string()
    .regex(/^\d{1,10}(\.\d{1,2})?$/, { error: "El precio es un número con hasta 2 decimales." })
    .refine((value) => Number(value) > 0, { error: "El precio tiene que ser mayor a 0." }),
);

export const startingPriceField = decimalInput("Escribí el precio de partida.").pipe(
  z
    .string()
    .regex(/^\d{1,10}(\.\d{1,2})?$/, { error: "El precio de partida es un número con hasta 2 decimales." })
    .refine((value) => Number(value) > 0, { error: "El precio de partida tiene que ser mayor a 0." }),
);

// Same bounds as the quantity columns: numeric(14,4).
export const tenderQuantityField = decimalInput("Escribí la cantidad.").pipe(
  z
    .string()
    .regex(/^\d{1,10}(\.\d{1,4})?$/, { error: "La cantidad es un número con hasta 4 decimales." })
    .refine((value) => Number(value) > 0, { error: "La cantidad tiene que ser mayor a 0." }),
);

export const tenderSpecsField = z
  .string()
  .trim()
  .max(MAX_SPECS_LENGTH, {
    error: `Las especificaciones deben tener como máximo ${MAX_SPECS_LENGTH} caracteres.`,
  })
  .default("");

export const tenderItemsLengthMessage = `Elegí entre 1 y ${MAX_TENDER_ITEMS} insumos.`;
export const tenderSuppliersMessage = "Dejá al menos un proveedor invitado.";
export const tenderDuplicateItemMessage = "Cada insumo puede estar una sola vez en la licitación.";

// RN-14 / RN-15: delivery and payment terms of a purchase order.
export const orderTermsField = (label: string) =>
  z
    .string({ error: `Escribí ${label}.` })
    .trim()
    .min(1, { error: `Escribí ${label}.` })
    .max(500, { error: `Escribí ${label} en hasta 500 caracteres.` });

// RN-21: the contact the emprendedor shares when asking to negotiate.
export const negotiationContactField = z
  .string({ error: "Escribí cómo te puede contactar el proveedor." })
  .trim()
  .min(3, { error: "Escribí cómo te puede contactar el proveedor." })
  .max(200, { error: "El contacto debe tener como máximo 200 caracteres." });
