import { describe, expect, it } from "vitest";

import { stepFromPathname } from "./wizard-steps";

describe("stepFromPathname", () => {
  it.each([
    ["/paso-1", 1],
    ["/paso-2", 2],
    ["/paso-7", 7],
    ["/paso-2/", 2],
  ])("reads the step from %s", (pathname, step) => {
    expect(stepFromPathname(pathname)).toBe(step);
  });

  it.each(["/", "/resultados", "/paso-0", "/paso-8", "/paso-x", "/paso-12"])(
    "returns null for %s",
    (pathname) => {
      expect(stepFromPathname(pathname)).toBeNull();
    },
  );
});
