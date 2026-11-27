import { z } from "zod";

// Field rules for supply tenders (docs/flujos/09-licitaciones.md RN-02, RN-09, RN-10).
// Shared by the publish form (client-side check, per item row) and by
// lib/db/tenders/validation.ts (the server gate). Pure and client-safe.
// Every rule declares its message in Spanish.

// RN-02 (#307): hours per round and round count are free inputs.
// 1–24 h (6 by default) lets the no-offer notice and the close be tried
// with a one-hour round, and keeps every tender already published
// (6, 12 or 24) valid. Round count stays 2–5 (4 by default).
export const MIN_ROUND_HOURS = 1;
export const MAX_ROUND_HOURS = 24;
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

function boundedInteger(min: number, max: number, message: string) {
  return integerInput.pipe(
    z.number({ error: message }).int({ error: message }).min(min, { error: message }).max(max, { error: message }),
  );
}

export const roundHoursField = boundedInteger(
  MIN_ROUND_HOURS,
  MAX_ROUND_HOURS,
  `Escribí entre ${MIN_ROUND_HOURS} y ${MAX_ROUND_HOURS} horas.`,
);

export const roundCountField = boundedInteger(
  MIN_ROUND_COUNT,
  MAX_ROUND_COUNT,
  `Escribí entre ${MIN_ROUND_COUNT} y ${MAX_ROUND_COUNT} rondas.`,
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

// RN-10 messages, with the limit the supplier has to respect.
export const offerAboveStartingMessage = (startingPrice: string) =>
  `Tu primera oferta no puede superar el precio de partida (${startingPrice}).`;
export const offerAboveLastMessage = (lastPrice: string) =>
  `No podés ofertar por encima de tu último precio (${lastPrice}). Podés bajarlo o mantenerlo.`;
export const offerEmptyMessage = "Escribí el precio de al menos un insumo.";

export const tenderItemsLengthMessage = `Elegí entre 1 y ${MAX_TENDER_ITEMS} insumos.`;
export const tenderSuppliersMessage = "Dejá al menos un proveedor invitado.";
export const tenderDraftItemsMessage = "Elegí al menos un insumo para guardar el borrador.";
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
