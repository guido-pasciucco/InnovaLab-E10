"use server";

import { headers } from "next/headers";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";
import { requestPasswordResetService } from "@/lib/services/auth";
import { getSiteOrigin } from "@/lib/site-origin";
import { type PasswordResetState } from "@/lib/types/auth";

// Action door: handleActionErrors turns any thrown error into form state,
// so no try/catch lives here. Success stays generic (anti-enumeration)
// and the service validates the email.
// The redirect origin is resolved on the server: a client-sent origin
// would let a direct caller point the reset link at another domain.
export const requestPasswordReset = handleActionErrors(
  async (_prevState: PasswordResetState, data: unknown) => {
    const redirectTo = `${getSiteOrigin(await headers())}/update-password`;
    return requestPasswordResetService(await createRscSupabaseClient(), data, redirectTo);
  },
  "AUTH_UNAVAILABLE",
);
