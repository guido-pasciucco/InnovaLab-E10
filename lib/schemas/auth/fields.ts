import { z } from "zod";

// Field rules: the single origin of every auth validation rule and its
// message. ./auth.ts composes them into the contracts, and form-only fields
// (the password confirmation) reuse them instead of copying the rule.
// Pure and client-safe: no db, no window.

export const emailField = z.email({ error: "Ingresá un correo electrónico válido." });

export const passwordField = z.string().min(8, { error: "La contraseña debe tener al menos 8 caracteres." });
