import "server-only";

import { redirect, unstable_rethrow } from "next/navigation";
import { AppError } from "@/lib/errors/app-error";
import { getSessionUserService, type SessionUser } from "@/lib/services/auth";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";

// Guard for protected Server Components: returns the validated session
// user or redirects to /login. A missing session is routine (no log);
// anything else (e.g. missing env) is logged and still treated as
// signed out, so a broken setup never renders a protected page.
export async function requireUser(): Promise<SessionUser> {
  let user: SessionUser | null = null;

  try {
    user = await getSessionUserService(await createRscSupabaseClient());
  } catch (err) {
    // cookies() signals dynamic rendering by throwing; never swallow it,
    // or the build would prerender the page as a static redirect.
    unstable_rethrow(err);
    if (!(err instanceof AppError)) console.error("[requireUser]", err);
  }

  // redirect() throws, so it stays outside the try.
  if (!user) redirect("/login");
  return user;
}
