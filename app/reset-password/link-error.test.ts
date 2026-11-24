import { describe, expect, it } from "vitest";
import { linkErrorMessage } from "./link-error";

describe("linkErrorMessage", () => {
  it("explains an invalid or expired link", () => {
    expect(linkErrorMessage("AUTH_LINK_INVALID")).toBe(
      "El enlace no es válido o venció. Pedí uno nuevo para continuar.",
    );
  });

  it("explains an auth outage", () => {
    expect(linkErrorMessage("AUTH_UNAVAILABLE")).toBe(
      "No pudimos conectar con el servicio de acceso. Intentá de nuevo en unos minutos.",
    );
  });

  it("explains an expired recovery session", () => {
    expect(linkErrorMessage("AUTH_SESSION_MISSING")).toBe(
      "Tu sesión venció. Pedí un enlace nuevo para continuar.",
    );
  });

  it.each([
    undefined,
    "",
    "INTERNAL",
    "<script>",
    ["AUTH_LINK_INVALID", "x"],
    // Crafted values must not slip past the exact-match allowlist.
    "AUTH_SESSION_MISSING ",
    " AUTH_SESSION_MISSING",
    "AUTH_SESSION_MISSING\n",
    "toString",
    "constructor",
    "__proto__",
    42,
    null,
  ])("shows nothing for %j (only known link errors are rendered)", (code) => {
    expect(linkErrorMessage(code as string | string[] | undefined)).toBeNull();
  });
});
