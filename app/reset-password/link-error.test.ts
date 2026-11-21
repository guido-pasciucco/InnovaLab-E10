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

  it.each([undefined, "", "INTERNAL", "<script>", ["AUTH_LINK_INVALID", "x"]])(
    "shows nothing for %j (only known link errors are rendered)",
    (code) => {
      expect(linkErrorMessage(code)).toBeNull();
    },
  );
});
