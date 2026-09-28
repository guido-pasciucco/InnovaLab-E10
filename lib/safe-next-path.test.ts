import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next-path";

const FALLBACK = "/update-password";

describe("safeNextPath", () => {
  it.each(["/update-password", "/dashboard?tab=1", "/profile#top", "/"])("keeps the same-origin path %s", (next) => {
    expect(safeNextPath(next, FALLBACK)).toBe(next);
  });

  it.each([
    ["missing", null],
    ["empty", ""],
    ["an absolute URL", "https://evil.example/update-password"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash authority", "/\\evil.example"],
    ["a leading backslash", "\\\\evil.example"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a path without a leading slash", "update-password"],
    ["a control character", "/\tevil"],
    ["an encoded newline", "/\r\n//evil.example"],
  ])("falls back when next is %s", (_label, next) => {
    expect(safeNextPath(next, FALLBACK)).toBe(FALLBACK);
  });
});
