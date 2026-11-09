import "server-only";

import { unstable_rethrow } from "next/navigation";
import { AppError } from "@/lib/errors/app-error";
import { getSessionUserService, type SessionUser } from "@/lib/services/auth";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";

// Like requireUser, for public Server Components that only adapt to a signed
// in user: returns the validated session user or null, never redirects. A
// missing session is routine (no log); anything else is logged and treated as
// signed out.
export async function getOptionalUser(): Promise<SessionUser | null> {
  try {
    return await getSessionUserService(await createRscSupabaseClient());
  } catch (err) {
    // cookies() signals dynamic rendering by throwing; never swallow it.
    unstable_rethrow(err);
    if (!(err instanceof AppError)) console.error("[getOptionalUser]", err);
    return null;
  }
}
