import { afterEach, describe, expect, it, vi } from "vitest";
import { type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors/app-error";
import { NEW_FAKE_PASSWORD, FAKE_PASSWORD } from "@/test/fixtures/auth";
import {
  getSessionUserService,
  loginService,
  logoutService,
  requestPasswordResetService,
  signupService,
  updatePasswordService,
} from "./auth";

function clientWith(signIn: () => Promise<unknown>) {
  return { auth: { signInWithPassword: vi.fn(signIn) } } as unknown as SupabaseClient;
}

const valid = { email: "a@b.com", password: FAKE_PASSWORD };

describe("loginService", () => {
  it("resolves on successful sign in", async () => {
    const client = clientWith(async () => ({ error: null }));
    await expect(loginService(client, valid)).resolves.toEqual({});
  });

  it("throws a ZodError for invalid input without calling Supabase", async () => {
    const client = clientWith(async () => ({ error: null }));
    await expect(loginService(client, { email: "nope" })).rejects.toMatchObject({ name: "ZodError" });
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("throws AUTH_INVALID_CREDENTIALS when Supabase rejects the credentials", async () => {
    const client = clientWith(async () => ({
      error: { message: "Invalid login credentials", code: "invalid_credentials", status: 400 },
    }));
    await expect(loginService(client, valid)).rejects.toEqual(new AppError("AUTH_INVALID_CREDENTIALS"));
  });

  it("throws AUTH_EMAIL_NOT_CONFIRMED when the account is not confirmed yet", async () => {
    const client = clientWith(async () => ({
      error: { message: "Email not confirmed", code: "email_not_confirmed", status: 400 },
    }));
    await expect(loginService(client, valid)).rejects.toMatchObject({ code: "AUTH_EMAIL_NOT_CONFIRMED" });
  });

  it.each([
    ["HTTP 429", { message: "Too many", status: 429 }],
    ["over_request_rate_limit", { message: "Too many", code: "over_request_rate_limit", status: 400 }],
  ])("throws AUTH_RATE_LIMITED on a rate limit (%s)", async (_label, error) => {
    const client = clientWith(async () => ({ error }));
    await expect(loginService(client, valid)).rejects.toMatchObject({ code: "AUTH_RATE_LIMITED" });
  });

  it.each([
    ["an upstream 5xx", { message: "Bad gateway", status: 502 }],
    ["a network failure (status 0)", { message: "fetch failed", name: "AuthRetryableFetchError", status: 0 }],
  ])("throws AUTH_UNAVAILABLE on %s", async (_label, error) => {
    const client = clientWith(async () => ({ error }));
    await expect(loginService(client, valid)).rejects.toMatchObject({ code: "AUTH_UNAVAILABLE" });
  });

  it("lets infrastructure errors bubble up untouched", async () => {
    const boom = new Error("network");
    const client = clientWith(async () => {
      throw boom;
    });
    await expect(loginService(client, valid)).rejects.toBe(boom);
  });
});

function authClient(auth: Record<string, () => Promise<unknown>>) {
  const mocked = Object.fromEntries(Object.entries(auth).map(([k, fn]) => [k, vi.fn(fn)]));
  return { auth: mocked } as unknown as SupabaseClient;
}

describe("signupService", () => {
  const input = { email: "a@b.com", password: FAKE_PASSWORD, displayName: " Ana " };

  it("signs up with a trimmed display name", async () => {
    const client = authClient({ signUp: async () => ({ error: null }) });
    await expect(signupService(client, input)).resolves.toEqual({});
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: "a@b.com",
      password: FAKE_PASSWORD,
      options: { data: { display_name: "Ana" } },
    });
  });

  it("throws a ZodError for invalid input", async () => {
    const client = authClient({ signUp: async () => ({ error: null }) });
    await expect(signupService(client, { email: "a@b.com" })).rejects.toMatchObject({ name: "ZodError" });
  });

  it("throws AUTH_SIGNUP_FAILED without revealing why", async () => {
    const client = authClient({
      signUp: async () => ({ error: { message: "User already registered", code: "user_already_exists", status: 422 } }),
    });
    await expect(signupService(client, input)).rejects.toEqual(new AppError("AUTH_SIGNUP_FAILED"));
  });

  it("throws AUTH_RATE_LIMITED when too many confirmation emails were sent", async () => {
    const client = authClient({
      signUp: async () => ({ error: { message: "Rate limit", code: "over_email_send_rate_limit", status: 429 } }),
    });
    await expect(signupService(client, input)).rejects.toMatchObject({ code: "AUTH_RATE_LIMITED" });
  });

  it("throws AUTH_UNAVAILABLE when Supabase is down", async () => {
    const client = authClient({ signUp: async () => ({ error: { message: "Service unavailable", status: 503 } }) });
    await expect(signupService(client, input)).rejects.toMatchObject({ code: "AUTH_UNAVAILABLE" });
  });
});

describe("logoutService", () => {
  it("resolves when sign out succeeds", async () => {
    const client = authClient({ signOut: async () => ({ error: null }) });
    await expect(logoutService(client)).resolves.toEqual({});
  });

  it("throws AUTH_SIGNOUT_FAILED when Supabase fails", async () => {
    const client = authClient({ signOut: async () => ({ error: { message: "x" } }) });
    await expect(logoutService(client)).rejects.toEqual(new AppError("AUTH_SIGNOUT_FAILED"));
  });
});

describe("getSessionUserService", () => {
  it("returns only the public user fields", async () => {
    const client = authClient({
      getUser: async () => ({ data: { user: { id: "u1", email: "a@b.com", role: "x" } }, error: null }),
    });
    await expect(getSessionUserService(client)).resolves.toEqual({ id: "u1", email: "a@b.com" });
  });

  it("throws UNAUTHORIZED when there is no user", async () => {
    const client = authClient({ getUser: async () => ({ data: { user: null }, error: null }) });
    await expect(getSessionUserService(client)).rejects.toEqual(new AppError("UNAUTHORIZED"));
  });

  it("throws UNAUTHORIZED when Supabase returns an error", async () => {
    const client = authClient({ getUser: async () => ({ data: { user: null }, error: { message: "jwt" } }) });
    await expect(getSessionUserService(client)).rejects.toEqual(new AppError("UNAUTHORIZED"));
  });
});

describe("requestPasswordResetService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the reset email with the given redirect", async () => {
    const client = authClient({ resetPasswordForEmail: async () => ({ error: null }) });
    await expect(
      requestPasswordResetService(client, { email: "a@b.com" }, "https://app.test/update-password"),
    ).resolves.toEqual({});
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith("a@b.com", {
      redirectTo: "https://app.test/update-password",
    });
  });

  it("resolves even when Supabase fails, to prevent account enumeration", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const client = authClient({ resetPasswordForEmail: async () => ({ error: { message: "not found", status: 400 } }) });
    await expect(requestPasswordResetService(client, { email: "a@b.com" }, "/x")).resolves.toEqual({});
  });

  it("logs the swallowed Supabase error on the server without the email", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const supabaseError = { message: "Service unavailable", status: 503 };
    const client = authClient({ resetPasswordForEmail: async () => ({ error: supabaseError }) });
    await requestPasswordResetService(client, { email: "a@b.com" }, "/x");
    const calls = [...error.mock.calls, ...warn.mock.calls];
    expect(calls).toContainEqual([expect.stringContaining("AUTH_UNAVAILABLE"), supabaseError]);
    expect(JSON.stringify(calls)).not.toContain("a@b.com");
  });

  it("throws a ZodError for an invalid email", async () => {
    const client = authClient({ resetPasswordForEmail: async () => ({ error: null }) });
    await expect(requestPasswordResetService(client, { email: "nope" }, "/x")).rejects.toMatchObject({
      name: "ZodError",
    });
  });
});

describe("updatePasswordService", () => {
  it("updates the password of the session user", async () => {
    const client = authClient({ updateUser: async () => ({ error: null }) });
    await expect(updatePasswordService(client, { password: NEW_FAKE_PASSWORD })).resolves.toEqual({});
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: NEW_FAKE_PASSWORD });
  });

  it("throws a ZodError for a short password", async () => {
    const client = authClient({ updateUser: async () => ({ error: null }) });
    await expect(updatePasswordService(client, { password: "123" })).rejects.toMatchObject({ name: "ZodError" });
  });

  it.each([
    ["weak_password", "Password is too weak"],
    ["same_password", "New password should be different"],
  ])("throws AUTH_PASSWORD_UPDATE_FAILED when Supabase rejects the password (%s)", async (code, message) => {
    const client = authClient({ updateUser: async () => ({ error: { message, code, status: 422 } }) });
    await expect(updatePasswordService(client, { password: NEW_FAKE_PASSWORD })).rejects.toMatchObject({
      code: "AUTH_PASSWORD_UPDATE_FAILED",
    });
  });

  it("throws AUTH_SESSION_MISSING when there is no session to update", async () => {
    const client = authClient({
      updateUser: async () => ({ error: { message: "Auth session missing!", name: "AuthSessionMissingError", status: 400 } }),
    });
    await expect(updatePasswordService(client, { password: NEW_FAKE_PASSWORD })).rejects.toMatchObject({
      code: "AUTH_SESSION_MISSING",
    });
  });

  it("throws AUTH_UNAVAILABLE when Supabase is down", async () => {
    const client = authClient({ updateUser: async () => ({ error: { message: "Bad gateway", status: 502 } }) });
    await expect(updatePasswordService(client, { password: NEW_FAKE_PASSWORD })).rejects.toMatchObject({
      code: "AUTH_UNAVAILABLE",
    });
  });
});

describe("signupService with an empty display name", () => {
  it("sends no display name instead of an empty string", async () => {
    const client = authClient({ signUp: async () => ({ error: null }) });
    await signupService(client, { email: "a@b.com", password: FAKE_PASSWORD, displayName: "  " });
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: "a@b.com",
      password: FAKE_PASSWORD,
      options: { data: { display_name: undefined } },
    });
  });
});
