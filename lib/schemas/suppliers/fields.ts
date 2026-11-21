import { z } from "zod";

import { isValidCuit, normalizeCuit } from "./cuit";

// Field rules for suppliers (docs/licitaciones, annex 03 step 5: "Completa
// negocio, CUIT, contacto y rubros"). Shared by the forms and by
// lib/db/suppliers/validation.ts. Pure and client-safe: no db imports.
// Every rule declares its message in Spanish.

export const supplierBusinessNameField = z
  .string({ error: "Escribí el nombre de tu negocio." })
  .trim()
  .min(1, { error: "Escribí el nombre de tu negocio." })
  .max(120, { error: "El nombre del negocio debe tener como máximo 120 caracteres." });

// Stored as 11 bare digits: dashes, dots and spaces are dropped first.
export const cuitField = z
  .string({ error: "Escribí el CUIT." })
  .trim()
  .transform(normalizeCuit)
  .pipe(
    z
      .string()
      .min(1, { error: "Escribí el CUIT." })
      .regex(/^\d{11}$/, { error: "El CUIT tiene 11 números (por ejemplo, 20-12345678-6)." })
      .refine(isValidCuit, { error: "El CUIT no es válido: revisá el último número." }),
  );

export const supplierContactNameField = z
  .string({ error: "Escribí el nombre de la persona de contacto." })
  .trim()
  .min(1, { error: "Escribí el nombre de la persona de contacto." })
  .max(120, { error: "El nombre de contacto debe tener como máximo 120 caracteres." });

export const supplierPhoneField = z
  .string({ error: "Escribí un teléfono de contacto." })
  .trim()
  .min(1, { error: "Escribí un teléfono de contacto." })
  .regex(/^\+?[\d\s()-]{6,30}$/, {
    error: "El teléfono solo puede tener números, espacios, guiones, paréntesis y un + inicial.",
  });

export const MAX_SUPPLIER_CATEGORIES = 10;

// Rubros: free text, typed separated by commas ("harinas, lácteos"). Free text
// because the supply catalog has no categories to choose from yet. Duplicates
// (ignoring case) are dropped.
export const supplierCategoriesField = z
  .union([z.string(), z.array(z.string())], { error: "Escribí al menos un rubro." })
  .transform((value) => {
    const parts = (Array.isArray(value) ? value : value.split(","))
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    const seen = new Set<string>();
    return parts.filter((part) => {
      const key = part.toLocaleLowerCase("es-AR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })
  .pipe(
    z
      .array(z.string().max(40, { error: "Cada rubro debe tener como máximo 40 caracteres." }))
      .min(1, { error: "Escribí al menos un rubro." })
      .max(MAX_SUPPLIER_CATEGORIES, {
        error: `Podés cargar hasta ${MAX_SUPPLIER_CATEGORIES} rubros.`,
      }),
  );

// Checkbox: the browser sends "on" when it is ticked and nothing otherwise.
export const supplierTermsField = z
  .union([z.literal("on"), z.literal(true)], {
    error: "Para registrarte tenés que aceptar los términos.",
  })
  .transform(() => true as const);

// Who the personal invite link is for, so the emprendedor can tell the links
// apart in the list (RN-23: one link per supplier).
export const supplierInviteLabelField = z
  .string({ error: "Escribí para quién es el enlace." })
  .trim()
  .min(1, { error: "Escribí para quién es el enlace." })
  .max(80, { error: "El nombre debe tener como máximo 80 caracteres." });

// Token in the personal invite link: 32 random bytes in base64url
// (43 characters). Anything else is not a link the app generated.
export const inviteTokenField = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
