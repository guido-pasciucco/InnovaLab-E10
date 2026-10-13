import { z } from "zod";

// Shared public business rules; pure and safe to consume from either boundary.
export const businessNameField = z
  .string({ error: "Escribí el nombre de tu negocio." })
  .trim()
  .min(1, { error: "Escribí el nombre de tu negocio." })
  .max(120, { error: "El nombre del negocio debe tener como máximo 120 caracteres." });

export const businessTypeField = z
  .string({ error: "Escribí el tipo de negocio." })
  .trim()
  .min(1, { error: "Escribí el tipo de negocio." })
  .max(80, { error: "El tipo de negocio debe tener como máximo 80 caracteres." });
