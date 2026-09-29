import { z } from "zod";

// Input validation at the edge: strict contract before touching auth.
// Field messages live here, once: RHF shows them in the client and the
// service's ZodError carries them to the server response (details.fieldErrors).

const email = z.email({ error: "Enter a valid email address" });
const password = z.string().min(8, { error: "Password must be at least 8 characters" });

export const loginSchema = z.object({ email, password });

export const signupSchema = z.object({
  email,
  password,
  // Optional in the form: an empty input arrives as "" and is valid.
  // The service turns it into "no display name".
  displayName: z
    .string()
    .trim()
    .max(80, { error: "Name must be at most 80 characters" })
    .optional(),
});

export const passwordResetRequestSchema = z.object({ email });

export const passwordUpdateSchema = z.object({ password });
