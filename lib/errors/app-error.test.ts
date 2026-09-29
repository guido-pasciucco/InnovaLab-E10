import { describe, expect, it, vi } from "vitest";
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
