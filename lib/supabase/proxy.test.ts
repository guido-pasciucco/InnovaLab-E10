import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CookieMethodsServer } from "@supabase/ssr";

// Simulates what supabase-js does during getClaims: read the incoming
// cookies, then (optionally) write rotated ones through setAll.
const getClaims = vi.fn<(cookies: CookieMethodsServer) => Promise<unknown>>();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, { cookies }: { cookies: CookieMethodsServer }) => ({
    auth: { getClaims: () => getClaims(cookies) },
  }),
}));

const { updateSession } = await import("./proxy");

function requestWithSession(): NextRequest {
  return new NextRequest("http://localhost:3000/dashboard", {
    headers: { cookie: "sb-auth-token=stale; theme=dark" },
  });
}

// Next forwards request headers to the page through these response headers.
function forwardedCookieHeader(response: Response): string | null {
  return response.headers.get("x-middleware-request-cookie");
}

describe("updateSession", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    getClaims.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hands the incoming cookies to Supabase", async () => {
    let seen: unknown;
    getClaims.mockImplementation(async (cookies) => {
      seen = await cookies.getAll();
    });
    await updateSession(requestWithSession());
    expect(seen).toEqual(
      expect.arrayContaining([
        { name: "sb-auth-token", value: "stale" },
        { name: "theme", value: "dark" },
      ]),
    );
  });

  it("sends refreshed cookies back to the browser", async () => {
    getClaims.mockImplementation(async (cookies) => {
      await cookies.setAll?.([{ name: "sb-auth-token", value: "fresh", options: { path: "/", httpOnly: true } }], {});
    });
    const response = await updateSession(requestWithSession());
    expect(response.cookies.get("sb-auth-token")).toMatchObject({ value: "fresh", path: "/", httpOnly: true });
  });

  it("forwards refreshed cookies to the page rendered in the same request", async () => {
    getClaims.mockImplementation(async (cookies) => {
      await cookies.setAll?.([{ name: "sb-auth-token", value: "fresh", options: {} }], {});
    });
    const response = await updateSession(requestWithSession());
    const forwarded = forwardedCookieHeader(response);
    expect(forwarded).toContain("sb-auth-token=fresh");
    expect(forwarded).not.toContain("sb-auth-token=stale");
    expect(forwarded).toContain("theme=dark");
  });

  it("applies the cache headers Supabase asks for", async () => {
    getClaims.mockImplementation(async (cookies) => {
      await cookies.setAll?.([{ name: "sb-auth-token", value: "fresh", options: {} }], {
        "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
      });
    });
    const response = await updateSession(requestWithSession());
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("passes the request through untouched when no refresh happens", async () => {
    getClaims.mockResolvedValue({});
    const response = await updateSession(requestWithSession());
    expect(response.cookies.getAll()).toEqual([]);
    expect(forwardedCookieHeader(response)).toContain("sb-auth-token=stale");
  });

  it("does not block the request when Supabase throws", async () => {
    getClaims.mockRejectedValue(new Error("network"));
    const response = await updateSession(requestWithSession());
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("does not block the request when the Supabase env is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const response = await updateSession(requestWithSession());
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(getClaims).not.toHaveBeenCalled();
  });
});
