import { z } from "zod";

import { passwordUpdateSchema } from "@/lib/schemas/auth/auth";
import { passwordField } from "@/lib/schemas/auth/fields";

// Client-side extension of the shared schema: the confirm-match check
// lives only in the form (the service validates the password itself).
// confirm reuses passwordField so both inputs always share the same rule.
// Kept outside the component so the dev-only preview can parse the exact
// same contract the form uses.
export const updatePasswordFormSchema = passwordUpdateSchema
  .extend({ confirm: passwordField })
  .refine((values) => values.password === values.confirm, {
    error: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

export type UpdatePasswordFormValues = z.infer<typeof updatePasswordFormSchema>;
