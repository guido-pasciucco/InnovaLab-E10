import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CookieMethodsServer } from "@supabase/ssr";
import { redirect } from "next/navigation";

const createServerClient = vi.fn();
const getAll = vi.fn();
const set = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll, set }) }));

const { createRscSupabaseClient, createWritableSupabaseClient } = await import("./rsc");

function adapter(): CookieMethodsServer {
  return createServerClient.mock.calls.at(-1)![2].cookies;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  createServerClient.mockReset().mockReturnValue({ tag: "client" });
  getAll.mockReset().mockReturnValue([{ name: "session", value: "synthetic-token" }]);
  set.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("createRscSupabaseClient", () => {
  it("reads incoming cookies without writing during a refresh", async () => {
    await createRscSupabaseClient();

    expect(await adapter().getAll()).toEqual([{ name: "session", value: "synthetic-token" }]);
    await adapter().setAll!([{ name: "session", value: "refreshed", options: { path: "/" } }], {});

    expect(set).not.toHaveBeenCalled();
  });
});

describe("createWritableSupabaseClient", () => {
  it("preserves cookie values and options when writes succeed", async () => {
    await createWritableSupabaseClient();
    const options = { path: "/", httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 0 };

    await adapter().setAll!([
      { name: "session.0", value: "chunk-0", options },
      { name: "session.1", value: "chunk-1", options },
    ], {});

    expect(set.mock.calls).toEqual([
      ["session.0", "chunk-0", options],
      ["session.1", "chunk-1", options],
    ]);
  });

  it.each([1, 2])("rejects without exposing cookie details when write %i fails", async (failedWrite) => {
    await createWritableSupabaseClient();
    set.mockImplementation(() => {
      if (set.mock.calls.length === failedWrite) throw new Error("synthetic-sensitive-token");
    });
    const write = () => adapter().setAll!([
      { name: "session.0", value: "chunk-0", options: {} },
      { name: "session.1", value: "chunk-1", options: {} },
      { name: "session.2", value: "chunk-2", options: {} },
    ], {});

    expect(write).toThrow("AUTH_COOKIE_PERSISTENCE");
    expect(set).toHaveBeenCalledTimes(failedWrite);
  });

  it("preserves Next redirect control flow when the cookie store throws it", async () => {
    await createWritableSupabaseClient();
    let signal: unknown;
    try { redirect("/login"); } catch (error) { signal = error; }
    set.mockImplementation(() => { throw signal; });

    expect(() => adapter().setAll!([{ name: "session", value: "", options: {} }], {})).toThrow(signal as Error);
  });

  it("rejects before constructing a client when configuration is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    await expect(createWritableSupabaseClient()).rejects.toThrow("Missing Supabase environment variables");

    expect(createServerClient).not.toHaveBeenCalled();
  });
});
