import { describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { AppError } from "./app-error";
import { handleActionErrors } from "./handle-action-errors";

describe("handleActionErrors", () => {
  it("wraps the returned value in an ok result", async () => {
    const action = handleActionErrors(async (n: number) => n * 2);
    await expect(action(21)).resolves.toEqual({ ok: true, data: 42 });
  });

  it("turns a thrown AppError into a serializable failure", async () => {
    const action = handleActionErrors(async () => {
      throw new AppError("AUTH_INVALID_CREDENTIALS");
    });
    await expect(action()).resolves.toEqual({
      ok: false,
      code: "AUTH_INVALID_CREDENTIALS",
      message: "Invalid email or password",
      details: undefined,
    });
  });

  it("uses the fallback code for unexpected throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const action = handleActionErrors(async () => {
      throw new Error("db down");
    }, "AUTH_UNAVAILABLE");
    await expect(action()).resolves.toMatchObject({ ok: false, code: "AUTH_UNAVAILABLE" });
  });

  it("lets Next.js control-flow errors (redirect) through", async () => {
    const action = handleActionErrors(async () => redirect("/home"));
    await expect(action()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
  });
});
