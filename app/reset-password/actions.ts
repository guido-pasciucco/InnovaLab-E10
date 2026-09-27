"use server";

import { z } from "zod";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";
import { requestPasswordResetService } from "@/lib/services/auth";
import { type PasswordResetState } from "@/lib/types/auth";

// Actions have no Request.url: the client sends its own origin so the
// service can build the PKCE redirect target for the email link.
const resetRequestInputSchema = z.object({
  email: z.email(),
  origin: z.url(),
});

// Action door: handleActionErrors turns any thrown error into form state,
// so no try/catch lives here. Success stays generic (anti-enumeration)
// and the service revalidates the email.
export const requestPasswordReset = handleActionErrors(
  async (_prevState: PasswordResetState, data: unknown) => {
    // Runtime validation at the door: ZodError becomes VALIDATION state
    // via toAppError, same as service-level validation.
    const parsed = resetRequestInputSchema.parse(data);
    return requestPasswordResetService(
      await createRscSupabaseClient(),
      { email: parsed.email },
      `${parsed.origin}/update-password`,
    );
  },
  "AUTH_UNAVAILABLE",
);
