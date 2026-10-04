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
  // only consumer (see docs/decisiones/establecidas/01).
  displayName: z
    .string()
    .trim()
    .max(80, { error: "Name must be at most 80 characters" })
    .optional(),
});

export const passwordResetRequestSchema = z.object({ email: emailField });

export const passwordUpdateSchema = z.object({ password: passwordField });
