import { describe, expect, it, vi } from "vitest";
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
    const client = clientWith(async () => ({ error: { message: "Invalid login" } }));
    await expect(loginService(client, valid)).rejects.toEqual(new AppError("AUTH_INVALID_CREDENTIALS"));
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
    const client = authClient({ signUp: async () => ({ error: { message: "User already registered" } }) });
    await expect(signupService(client, input)).rejects.toEqual(new AppError("AUTH_SIGNUP_FAILED"));
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
    const client = authClient({ resetPasswordForEmail: async () => ({ error: { message: "not found" } }) });
    await expect(requestPasswordResetService(client, { email: "a@b.com" }, "/x")).resolves.toEqual({});
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

  it("throws AUTH_PASSWORD_UPDATE_FAILED when Supabase rejects it", async () => {
    const client = authClient({ updateUser: async () => ({ error: { message: "no session" } }) });
    await expect(updatePasswordService(client, { password: NEW_FAKE_PASSWORD })).rejects.toEqual(
      new AppError("AUTH_PASSWORD_UPDATE_FAILED"),
    );
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
