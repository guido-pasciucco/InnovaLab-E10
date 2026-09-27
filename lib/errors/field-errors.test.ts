import { describe, expect, it } from "vitest";
import { failResult, okResult } from "./catalog";
import { getFieldErrors } from "./field-errors";

describe("getFieldErrors", () => {
  it("returns nothing for successful or empty states", () => {
    expect(getFieldErrors(undefined)).toEqual({});
    expect(getFieldErrors(okResult({}))).toEqual({});
  });

  it("returns nothing for non-validation failures", () => {
    expect(getFieldErrors(failResult("AUTH_INVALID_CREDENTIALS"))).toEqual({});
  });

  it("extracts the first message of each field from a VALIDATION failure", () => {
    const state = failResult("VALIDATION", {
      formErrors: [],
      fieldErrors: { email: ["Enter a valid email address", "second"], password: [] },
    });
    expect(getFieldErrors(state)).toEqual({ email: "Enter a valid email address" });
  });

  it("ignores malformed details instead of crashing", () => {
    expect(getFieldErrors(failResult("VALIDATION", "oops"))).toEqual({});
    expect(getFieldErrors(failResult("VALIDATION", { fieldErrors: { email: "nope" } }))).toEqual({});
  });
});
