import { describe, expect, it } from "vitest";

import { LINK_ERROR_MESSAGES, linkErrorMessageEs } from "./link-error-messages";

describe("linkErrorMessageEs", () => {
  it("traduce el enlace inválido o vencido", () => {
    expect(linkErrorMessageEs("AUTH_LINK_INVALID")).toBe(
      "El enlace no es válido o venció. Pedí uno nuevo para continuar.",
    );
  });

  it.each(Object.entries(LINK_ERROR_MESSAGES))("devuelve el texto de %s", (code, message) => {
    expect(linkErrorMessageEs(code)).toBe(message);
  });

  it("no inventa texto para un código desconocido", () => {
    expect(linkErrorMessageEs("AUTH_OTRO")).toBeNull();
    expect(linkErrorMessageEs("")).toBeNull();
  });
});
