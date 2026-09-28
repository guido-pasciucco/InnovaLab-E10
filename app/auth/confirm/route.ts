import { type NextRequest } from "next/server";
import { redirect, unstable_rethrow } from "next/navigation";
import { toAppError } from "@/lib/errors/app-error";
import { type ErrorCode } from "@/lib/errors/catalog";
import { confirmAuthLinkService } from "@/lib/services/auth";
import { safeNextPath } from "@/lib/safe-next-path";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";

const DEFAULT_NEXT = "/update-password";

// Landing route of auth email links (password reset). Exchanges the link
// params for a session, which the cookies() adapter writes onto this
// response, then continues to `next`. `next` is sanitized so the link can
// never bounce the user to another site. On failure the user goes back to
// /reset-password, which reads the error code to explain what happened.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"), DEFAULT_NEXT);

  let failure: ErrorCode | null = null;
  try {
    await confirmAuthLinkService(await createRscSupabaseClient(), {
      code: searchParams.get("code"),
      tokenHash: searchParams.get("token_hash"),
      type: searchParams.get("type"),
    });
  } catch (err) {
    unstable_rethrow(err);
    // toAppError logs it; unknown throws (e.g. missing env) become AUTH_UNAVAILABLE.
    failure = toAppError(err, "AUTH_UNAVAILABLE").code;
  }

  // redirect() throws, so it stays outside the try.
  if (failure) redirect(`/reset-password?error=${failure}`);
  redirect(next);
}
