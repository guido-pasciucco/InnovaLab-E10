import { afterEach, describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";
import { AppError } from "./app-error";
import { ERROR_CATALOG } from "./catalog";
import { ok, handleRouteErrors } from "./handle-route-errors";

describe("handleRouteErrors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes successful responses through", async () => {
    const handler = handleRouteErrors(async () => ok({ hi: true }));
    const res = await handler();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ hi: true });
  });

  it("translates a thrown AppError into the catalog status and envelope", async () => {
    const handler = handleRouteErrors(async () => {
      throw new AppError("AUTH_INVALID_CREDENTIALS");
    });
    const res = await handler();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: { code: "AUTH_INVALID_CREDENTIALS", message: "Invalid email or password" },
    });
  });

  it("uses the fallback code for unexpected throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = handleRouteErrors(async () => {
      throw new Error("boom");
    }, "AUTH_UNAVAILABLE");
    const res = await handler();
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "AUTH_UNAVAILABLE" } });
  });

  it("lets Next.js control-flow errors (redirect) through", async () => {
    const handler = handleRouteErrors(async () => redirect("/home"));
    await expect(handler()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });

  it("lets Next.js control-flow errors (notFound) through", async () => {
    const handler = handleRouteErrors(async () => notFound());
    // In this Next version notFound() throws digest "NEXT_HTTP_ERROR_FALLBACK;404".
    await expect(handler()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK"),
    });
  });

  it("returns the exact fallback envelope for unexpected throws, without leaking the cause", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = handleRouteErrors(async () => {
      throw new Error("db connection refused at 10.0.0.4");
    }, "AUTH_UNAVAILABLE");
    const res = await handler();
    expect(res.status).toBe(503);
    // Exact equality: no `details`, no internal message, no extra keys.
    await expect(res.json()).resolves.toEqual({
      error: { code: "AUTH_UNAVAILABLE", message: ERROR_CATALOG.AUTH_UNAVAILABLE.message },
    });
  });

  it("keeps AppError details in the envelope and never exposes the cause", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = handleRouteErrors(async () => {
      throw new AppError("AUTH_INVALID_CREDENTIALS", { attempts: 3 }, {
        cause: new Error("supabase down"),
      });
    });
    const res = await handler();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "AUTH_INVALID_CREDENTIALS",
        message: ERROR_CATALOG.AUTH_INVALID_CREDENTIALS.message,
        details: { attempts: 3 },
      },
    });
  });
});
