import { describe, expect, it } from "vitest";
import { linkErrorMessage } from "./link-error";

describe("linkErrorMessage", () => {
  it("explains an invalid or expired link", () => {
    expect(linkErrorMessage("AUTH_LINK_INVALID")).toBe("This link is invalid or has expired. Please request a new one");
  });

  it("explains an auth outage", () => {
    expect(linkErrorMessage("AUTH_UNAVAILABLE")).toBe("Authentication unavailable");
  });

  it.each([undefined, "", "INTERNAL", "<script>", ["AUTH_LINK_INVALID", "x"]])(
    "shows nothing for %j (only known link errors are rendered)",
    (code) => {
      expect(linkErrorMessage(code)).toBeNull();
    },
  );
});
