import { describe, expect, it } from "vitest";
import { ERROR_CATALOG } from "./catalog";

// Generic codes are shared by every domain, so their messages must not
// mention any specific feature. Everything else needs a DOMAIN_ prefix.
const GENERIC_CODES = ["VALIDATION", "UNAUTHORIZED", "INTERNAL"];

describe("ERROR_CATALOG naming convention", () => {
  it("keeps generic codes with generic messages", () => {
    expect(ERROR_CATALOG.VALIDATION.message).toBe("Invalid input");
    expect(ERROR_CATALOG.INTERNAL.message).toBe("Something went wrong");
  });

  it("prefixes every domain-specific code with its domain", () => {
    const domainCodes = Object.keys(ERROR_CATALOG).filter((c) => !GENERIC_CODES.includes(c));
    for (const code of domainCodes) {
      expect(code).toMatch(/^[A-Z]+_[A-Z_]+$/);
    }
  });

  it("exposes the auth-specific codes", () => {
    expect(ERROR_CATALOG.AUTH_INVALID_CREDENTIALS).toMatchObject({ status: 401 });
    expect(ERROR_CATALOG.AUTH_UNAVAILABLE).toMatchObject({ status: 500 });
    expect(ERROR_CATALOG.AUTH_SIGNUP_FAILED).toMatchObject({ status: 400 });
    expect(ERROR_CATALOG.AUTH_SIGNOUT_FAILED).toMatchObject({ status: 500 });
    expect(ERROR_CATALOG.AUTH_PASSWORD_UPDATE_FAILED).toMatchObject({ status: 401 });
  });
});
