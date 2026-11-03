import { describe, expect, it } from "vitest";

import {
  STEP_HREFS,
  TOTAL_STEPS,
  resumeHref,
  stepFromPathname,
} from "./wizard-steps";

describe("stepFromPathname", () => {
  it.each([
    ["/paso-1", 1],
    ["/paso-2", 2],
    ["/paso-6", 6],
    ["/paso-2/", 2],
  ])("reads the step from %s", (pathname, step) => {
    expect(stepFromPathname(pathname)).toBe(step);
  });

  it.each(["/", "/resultados", "/paso-0", "/paso-7", "/paso-x", "/paso-12"])(
    "returns null for %s",
    (pathname) => {
      expect(stepFromPathname(pathname)).toBeNull();
    },
  );
});

describe("STEP_HREFS", () => {
  it("maps every step to its /paso-N route", () => {
    for (let step = 1; step <= TOTAL_STEPS; step++) {
      expect(STEP_HREFS[step]).toBe(`/paso-${step}`);
    }
  });
});

describe("resumeHref", () => {
  it.each([
    [1, "/paso-1"],
    [2, "/paso-2"],
    [6, "/paso-6"],
  ])("sends furthest step %i to %s", (step, href) => {
    expect(resumeHref(step)).toBe(href);
  });

  it.each([
    [0, "/paso-1"],
    [-3, "/paso-1"],
    [Number.NaN, "/paso-1"],
    [7, "/paso-6"],
    [2.9, "/paso-2"],
  ])("clamps %s to a real step (%s)", (step, href) => {
    expect(resumeHref(step)).toBe(href);
  });
});
