import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError, toAppError } from "./app-error";

describe("AppError", () => {
  it("takes its message from the catalog", () => {
    const err = new AppError("AUTH_INVALID_CREDENTIALS");
    expect(err.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(err.message).toBe("Invalid email or password");
  });
});

describe("toAppError", () => {
  it("returns AppError instances untouched", () => {
    const err = new AppError("UNAUTHORIZED", { a: 1 });
    expect(toAppError(err)).toBe(err);
  });

  it("maps ZodError to VALIDATION with flattened details", () => {
    const result = z.object({ email: z.email() }).safeParse({ email: "x" });
    const err = toAppError(result.error);
    expect(err.code).toBe("VALIDATION");
    expect(err.details).toMatchObject({ fieldErrors: { email: expect.any(Array) } });
  });

  it("maps unknown throws to the fallback code and logs them", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(toAppError(new Error("boom")).code).toBe("INTERNAL");
    expect(toAppError("boom", "AUTH_UNAVAILABLE").code).toBe("AUTH_UNAVAILABLE");
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});

describe("toAppError with schema messages", () => {
  it("carries the schema's custom messages in details.fieldErrors", () => {
    const schema = z.object({ email: z.email({ error: "Enter a valid email address" }) });
    const result = schema.safeParse({ email: "x" });
    expect(toAppError(result.error).details).toEqual({
      formErrors: [],
      fieldErrors: { email: ["Enter a valid email address"] },
    });
  });
});

describe("toAppError logging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs an expected AppError at the catalog's warn level", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    toAppError(new AppError("AUTH_INVALID_CREDENTIALS"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("AUTH_INVALID_CREDENTIALS"));
    expect(error).not.toHaveBeenCalled();
  });

  it("logs an infrastructure AppError at the catalog's error level, with its cause", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = new Error("upstream 502");
    toAppError(new AppError("AUTH_UNAVAILABLE", undefined, { cause }));
    expect(error).toHaveBeenCalledWith(expect.stringContaining("AUTH_UNAVAILABLE"), cause);
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not log codes whose catalog level is silent", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    toAppError(z.object({ email: z.email() }).safeParse({ email: "x" }).error);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("never exposes the cause to the client-facing details", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const err = toAppError(new AppError("AUTH_UNAVAILABLE", undefined, { cause: new Error("secret") }));
    expect(err.details).toBeUndefined();
  });
});
