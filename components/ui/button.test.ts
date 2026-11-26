import { describe, expect, it } from "vitest";

import { buttonClassName } from "./button";

describe("buttonClassName", () => {
  it("includes the shared cursor, focus and disabled styles", () => {
    const classes = buttonClassName();

    expect(classes).toContain("cursor-pointer");
    expect(classes).toContain("focus-visible:outline-focus");
    expect(classes).toContain("disabled:cursor-not-allowed");
  });

  it("defaults to the primary variant and medium size", () => {
    const classes = buttonClassName();

    expect(classes).toContain("bg-action-primary");
    expect(classes).toContain("min-h-11");
  });

  it("applies the selected variant and size", () => {
    const classes = buttonClassName({ variant: "danger", size: "sm" });

    expect(classes).toContain("text-danger");
    expect(classes).toContain("min-h-9");
    expect(classes).not.toContain("bg-action-primary");
  });

  it("keeps caller classes last so callers can extend the styles", () => {
    expect(buttonClassName({ className: "sm:w-auto" }).endsWith("sm:w-auto")).toBe(true);
  });
});
