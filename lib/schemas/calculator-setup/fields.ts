import { z } from "zod";

// Field rules: the single origin of every validation rule and user-facing
// message. Contracts compose these atoms instead of redefining them:
// ./calculator-setup.ts builds the form contract and lib/db/validation.ts reuses
// them as drizzle-zod refinements. Pure and client-safe: no db, no window.

export const productNameField = z
  .string()
  .trim()
  .min(1, { error: "Escribí el nombre de tu producto." })
  .max(120);

export const unitField = z
  .string()
  .trim()
  .min(1, { error: "Escribí en qué unidad lo vendés (ej: caja, paquete, kilo)." })
  .max(40);

export const volumeField = z
  .int({ error: "Completá el volumen con un número entero." })
  .positive({ error: "El volumen tiene que ser mayor que 0." });

export const currencyField = z.literal("ARS", { error: "La moneda es ARS y no se puede cambiar." });

export const periodField = z.literal("Mensual", {
  error: "El período es mensual y no se puede cambiar.",
});
