import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";
import {
  loginSchema,
  passwordResetRequestSchema,
  passwordUpdateSchema,
  signupSchema,
} from "@/lib/schemas/auth/auth";
import { AppError } from "@/lib/errors/app-error";

// Auth services throw on failure; the doors (handleRouteErrors /
// handleActionErrors) translate errors. Input is raw and unvalidated:
// validating here once covers every door that calls the service.

export async function loginService(
  client: SupabaseClient,
  input: unknown,
): Promise<Record<string, never>> {
  const credentials = loginSchema.parse(input);

  const { error } = await client.auth.signInWithPassword(credentials);

  if (error) {
    // Generic on purpose: never leak auth details.
    throw new AppError("AUTH_INVALID_CREDENTIALS");
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
    throw new AppError("AUTH_SIGNUP_FAILED");
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

  // The Supabase error is ignored on purpose: always answering success
  // prevents account enumeration. Infrastructure throws still bubble up.
  await client.auth.resetPasswordForEmail(email, { redirectTo });

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
    throw new AppError("AUTH_PASSWORD_UPDATE_FAILED");
  }

  return {};
}
