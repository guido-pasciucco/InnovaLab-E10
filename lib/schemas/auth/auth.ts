import { z } from "zod";

import { emailField, passwordField } from "./fields";

// Input validation at the edge: strict contract before touching auth.
// Field rules and messages come from ./fields, once: RHF shows them in the
// client and the service's ZodError carries them to the server response
// (details.fieldErrors).

export const loginSchema = z.object({ email: emailField, password: passwordField });

export const signupSchema = z.object({
  email: emailField,
  password: passwordField,
  // Optional in the form: an empty input arrives as "" and is valid.
  // The service turns it into "no display name". Kept inline: signup is its
  // only consumer (see docs/decisiones/establecidas/desarrollo/01).
  displayName: z
    .string()
    .trim()
    .max(80, { error: "El nombre debe tener como máximo 80 caracteres." })
    .optional(),
});

// Client-side contract of the signup form (the screen's exact shape).
// Extends the signup contract with the password confirmation, which only
// exists in the browser: it reuses passwordField (one rule, one message)
// and never reaches the service — the form strips it before dispatching
// the action, so `signupSchema` stays the payload contract of the server.
export const signupFormSchema = signupSchema
  .extend({ confirmPassword: passwordField })
  .refine((values) => values.password === values.confirmPassword, {
    error: "Las contraseñas no coinciden.",
    // The mismatch is reported under the confirmation field, where it is fixed.
    path: ["confirmPassword"],
  });

export const passwordResetRequestSchema = z.object({ email: emailField });

// Email-only contract for the signup verification screen (resend + status check).
export const verificationEmailSchema = z.object({ email: emailField });

export const passwordUpdateSchema = z.object({ password: passwordField });
