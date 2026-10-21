import { afterEach, describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";
import { z, ZodError } from "zod";
import { AppError } from "./app-error";
import { handleRscErrors } from "./handle-rsc-errors";

describe("handleRscErrors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the read value without logging", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(handleRscErrors(async () => ({ volume: 10 }))).resolves.toEqual({ volume: 10 });

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it("rethrows a known AppError and logs it at its catalog level", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = new AppError("CALC_UNAVAILABLE");

    await expect(
      handleRscErrors(async () => {
        throw boom;
      }),
    ).rejects.toBe(boom);
    expect(log).toHaveBeenCalledWith("[CALC_UNAVAILABLE] Calculator unavailable");
  });

  it("reclassifies a read-side ZodError as infrastructure, never as VALIDATION", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const rowSchema = z.object({ volume: z.number() });

    const thrown = await handleRscErrors(
      async () => rowSchema.parse({ volume: "not-a-number" }),
      "CALC_UNAVAILABLE",
    ).catch((err: unknown) => err);

    expect(thrown).toBeInstanceOf(AppError);
    const appError = thrown as AppError;
    expect(appError.code).toBe("CALC_UNAVAILABLE");
    expect(appError.code).not.toBe("VALIDATION");
    expect(appError.cause).toBeInstanceOf(ZodError);
    expect(log).toHaveBeenCalledWith(
      "[CALC_UNAVAILABLE] Calculator unavailable",
      expect.any(ZodError),
    );
  });

  it("uses the default INTERNAL fallback for an unknown throw", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      handleRscErrors(async () => {
        throw new Error("db down");
      }),
    ).rejects.toMatchObject({ code: "INTERNAL" });
    expect(log).toHaveBeenCalledWith("[INTERNAL]", expect.any(Error));
  });

  it("uses the explicit fallback code for an unknown throw", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      handleRscErrors(async () => {
        throw new Error("db down");
      }, "CALC_UNAVAILABLE"),
    ).rejects.toMatchObject({ code: "CALC_UNAVAILABLE" });
    expect(log).toHaveBeenCalledWith("[CALC_UNAVAILABLE]", expect.any(Error));
  });

  it("lets redirect() through with its NEXT_REDIRECT digest", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(handleRscErrors(async () => redirect("/home"))).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(log).not.toHaveBeenCalled();
  });

  it("lets notFound() through with its HTTP fallback digest intact", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    // Next 16 encodes notFound() as the HTTP access fallback error
    // (digest NEXT_HTTP_ERROR_FALLBACK;404 — the legacy NEXT_NOT_FOUND
    // name is not produced by this runtime).
    await expect(handleRscErrors(async () => notFound())).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
    expect(log).not.toHaveBeenCalled();
  });
});
