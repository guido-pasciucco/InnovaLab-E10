import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { format } from "node:util";
import { fakerES as faker } from "@faker-js/faker";
import { NextRequest } from "next/server";

const store = new Map<string, string>();
const set = vi.fn((name: string, value: string) => { store.set(name, value); });
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [...store].map(([name, value]) => ({ name, value })),
    set,
  }),
  headers: async () => new Headers({ origin: "http://127.0.0.1:3100" }),
}));

// Real SSR client, auth services and transport doors. Only Next's cookie
// store and the HTTP provider are replaced; no session or service is mocked.
const { login } = await import("@/app/login/actions");
const { signup } = await import("@/app/signup/actions");
const { updatePassword } = await import("@/app/update-password/actions");
const { logout } = await import("@/app/dashboard/actions");
const { requestPasswordReset } = await import("@/app/reset-password/actions");
const { GET } = await import("@/app/auth/confirm/route");
const fakeUser = { id: "00000000-0000-4000-8000-000000000001", email: "qa@example.test", aud: "authenticated" };
const token = [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ sub: fakeUser.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url"),
  "synthetic-signature",
].join(".");
const sessionResponse = { access_token: token, refresh_token: "synthetic-refresh-token", token_type: "bearer", expires_in: 3600, user: fakeUser };
const credentials = { email: fakeUser.email, password: faker.internet.password({ length: 16 }) };

beforeEach(() => {
  store.clear();
  set.mockReset().mockImplementation((name, value) => { store.set(name, value); });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_synthetic");
  vi.stubEnv("SITE_URL", "http://127.0.0.1:3100");
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
    if (url.hostname !== "127.0.0.1") throw new Error("Non-local provider");
    if (url.pathname.endsWith("/logout")) return new Response(null, { status: 204 });
    if (url.pathname.endsWith("/recover")) return Response.json({});
    if (url.pathname.endsWith("/user")) return Response.json(init?.method === "PUT"
      ? { ...fakeUser, updated_at: "2026-01-01T00:00:00Z" }
      : fakeUser);
    return Response.json(sessionResponse);
  }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function loggedOutput(): string {
  return [...vi.mocked(console.error).mock.calls, ...vi.mocked(console.warn).mock.calls]
    .map((call) => format(...call)).join("\n");
}

function failWrites() {
  set.mockImplementation(() => { throw new Error("synthetic-sensitive-token"); });
}

describe("login", () => {
  it("returns AUTH_UNAVAILABLE without logging token values when cookie persistence fails", async () => {
    failWrites();

    const result = await login(undefined, credentials);

    expect(result).toMatchObject({ ok: false, code: "AUTH_UNAVAILABLE" });
    expect(loggedOutput()).not.toContain("synthetic-sensitive-token");
    expect(loggedOutput()).not.toContain(token);
  });
});

describe("logout", () => {
  it("redirects to login when remote sign out completes but deleting session cookies fails", async () => {
    expect(await login(undefined, credentials)).toMatchObject({ ok: true });
    failWrites();

    await expect(logout()).rejects.toMatchObject({ digest: expect.stringContaining("/login?notice=signed-out") });
    expect(loggedOutput()).not.toContain("synthetic-sensitive-token");
  });
});

describe("requestPasswordReset", () => {
  it("does not report success when the PKCE verifier cannot be persisted", async () => {
    failWrites();

    const result = await requestPasswordReset(undefined, { email: fakeUser.email });

    expect(result).toMatchObject({ ok: false, code: "AUTH_UNAVAILABLE" });
  });
});

describe("GET /auth/confirm", () => {
  it("redirects to the existing error page when recovery cookies cannot be persisted", async () => {
    failWrites();

    await expect(GET(new NextRequest("http://127.0.0.1:3100/auth/confirm?token_hash=synthetic&type=recovery")))
      .rejects.toMatchObject({ digest: expect.stringContaining("/reset-password?error=AUTH_UNAVAILABLE") });
    expect(loggedOutput()).not.toContain("synthetic-sensitive-token");
  });

  it("keeps the success redirect when recovery cookies are persisted", async () => {
    await expect(GET(new NextRequest("http://127.0.0.1:3100/auth/confirm?token_hash=synthetic&type=recovery&next=/dashboard")))
      .rejects.toMatchObject({ digest: expect.stringContaining("/dashboard") });

    expect(set).toHaveBeenCalled();
  });
});

describe("signup", () => {
  it("does not return success when session cookies cannot be persisted", async () => {
    failWrites();

    const result = await signup(undefined, credentials);

    expect(result).toMatchObject({ ok: false, code: "AUTH_UNAVAILABLE" });
  });
});

describe("updatePassword", () => {
  it("does not return success when updated session cookies cannot be persisted", async () => {
    expect(await login(undefined, credentials)).toMatchObject({ ok: true });
    failWrites();

    const result = await updatePassword(undefined, { password: faker.internet.password({ length: 16 }) });

    expect(result).toMatchObject({ ok: false, code: "AUTH_UNAVAILABLE" });
  });
});
