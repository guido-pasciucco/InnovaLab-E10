import { describe, expect, it } from "vitest";

import { authErrorMessage } from "./auth-error-messages";

describe("authErrorMessage", () => {
  it("traduce el enlace inválido o vencido", () => {
    expect(authErrorMessage("AUTH_LINK_INVALID")).toBe(
      "El enlace no es válido o venció. Pedí uno nuevo para continuar.",
    );
  });

  it("traduce la sesión vencida", () => {
    expect(authErrorMessage("AUTH_SESSION_MISSING")).toBe(
      "Tu sesión venció. Pedí un enlace nuevo para continuar.",
    );
  });

  it("no inventa texto para un código desconocido", () => {
    expect(authErrorMessage("AUTH_OTRO")).toBeNull();
    expect(authErrorMessage("")).toBeNull();
    expect(authErrorMessage(undefined)).toBeNull();
  });
});
