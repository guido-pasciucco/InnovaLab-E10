import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";
import {
  loginSchema,
  passwordResetRequestSchema,
  passwordUpdateSchema,
  signupSchema,
} from "@/lib/schemas/auth/auth";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CATALOG, type ErrorCode } from "@/lib/errors/catalog";

// Auth services throw on failure; the doors (handleRouteErrors /
// handleActionErrors) translate errors. Input is raw and unvalidated:
// validating here once covers every door that calls the service.

// Shape of the errors supabase-js returns (AuthError and subclasses).
// Read structurally so plain test doubles work too.
type SupabaseAuthFailure = { name?: string; code?: string; status?: number };

const RATE_LIMIT_CODES = new Set([
  "over_request_rate_limit",
  "over_email_send_rate_limit",
  "over_sms_send_rate_limit",
]);

// Failures that are not about the user's input: every service reports
// them the same way. Returns null for ordinary 4xx rejections.
function classifyInfrastructureFailure(error: SupabaseAuthFailure): ErrorCode | null {
  if (error.status === 429 || (error.code && RATE_LIMIT_CODES.has(error.code))) {
    return "AUTH_RATE_LIMITED";
  }
  // No status or status 0 means the request never got an HTTP answer.
  if (!error.status || error.status >= 500) return "AUTH_UNAVAILABLE";
  return null;
}

// Maps a Supabase auth error to an AppError: infrastructure failures
// first, then per-service codes, then the service's generic fallback.
// The raw error travels as `cause`, so it reaches the log, never the client.
function toAuthAppError(
  error: SupabaseAuthFailure,
  fallback: ErrorCode,
  byCode: Partial<Record<string, ErrorCode>> = {},
): AppError {
  const code =
    classifyInfrastructureFailure(error) ?? (error.code ? byCode[error.code] : undefined) ?? fallback;
  return new AppError(code, undefined, { cause: error });
}

export async function loginService(
  client: SupabaseClient,
  input: unknown,
): Promise<Record<string, never>> {
  const credentials = loginSchema.parse(input);

  const { error } = await client.auth.signInWithPassword(credentials);

  if (error) {
    // Generic on purpose: wrong email and wrong password look the same.
    throw toAuthAppError(error, "AUTH_INVALID_CREDENTIALS", {
      email_not_confirmed: "AUTH_EMAIL_NOT_CONFIRMED",
    });
  }

  return {};
}

export async function signupService(
  client: SupabaseClient,
  input: unknown,
): Promise<Record<string, never>> {
  const { email, password, displayName } = signupSchema.parse(input);

  const { error } = await client.auth.signUp({
    email,
    password,
    // Empty name ("" after trim) means no display name at all.
    options: { data: { display_name: displayName || undefined } },
  });

  if (error) {
    // Generic on purpose: never reveal whether the email already exists.
    // Rate limits and outages are not about the account, so they surface.
    throw toAuthAppError(error, "AUTH_SIGNUP_FAILED");
  }

  return {};
}

export async function logoutService(
  client: SupabaseClient,
): Promise<Record<string, never>> {
  const { error } = await client.auth.signOut();

  if (error) {
    throw new AppError("AUTH_SIGNOUT_FAILED");
  }

  return {};
}

export type SessionUser = { id: string; email: string | undefined };

export async function getSessionUserService(
  client: SupabaseClient,
): Promise<SessionUser> {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new AppError("UNAUTHORIZED");
  }

  // Expose only public fields, never the full Supabase user.
  return { id: data.user.id, email: data.user.email };
}

export async function requestPasswordResetService(
  client: SupabaseClient,
  input: unknown,
  // Where the email link lands for the PKCE code exchange.
  redirectTo: string,
): Promise<Record<string, never>> {
  const { email } = passwordResetRequestSchema.parse(input);

  // The Supabase error never reaches the user: always answering success
  // prevents account enumeration. It is logged (without the email) so
  // outages and rate limits stay visible. Infrastructure throws still bubble up.
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    const code = classifyInfrastructureFailure(error);
    const label = `[${code ?? "AUTH_PASSWORD_RESET_REJECTED"}] Password reset email not sent`;
    if (code && ERROR_CATALOG[code].logLevel === "error") console.error(label, error);
    else console.warn(label, error);
  }

  return {};
}

export async function updatePasswordService(
  client: SupabaseClient,
  input: unknown,
): Promise<Record<string, never>> {
  const { password } = passwordUpdateSchema.parse(input);

  // Requires an active recovery session: the user identity comes from
  // the session cookies, never from client-sent ids.
  const { error } = await client.auth.updateUser({ password });

  if (error) {
    if (error.name === "AuthSessionMissingError" || error.code === "session_not_found" || error.code === "session_expired") {
      throw new AppError("AUTH_SESSION_MISSING", undefined, { cause: error });
    }
    throw toAuthAppError(error, "AUTH_PASSWORD_UPDATE_FAILED");
  }

  return {};
}
