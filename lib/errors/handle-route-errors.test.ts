import { describe, expect, it, vi } from "vitest";
import { AppError } from "./app-error";
import { ok, handleRouteErrors } from "./handle-route-errors";

describe("handleRouteErrors", () => {
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
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "AUTH_UNAVAILABLE" } });
  });
});
