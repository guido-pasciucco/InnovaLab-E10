import { describe, expect, it } from "vitest";

import { updatePasswordFormSchema } from "@/app/update-password/update-password-schema";
import { passwordResetRequestSchema } from "@/lib/schemas/auth/auth";
import { previewFieldMessage } from "./preview-errors";

// The dev-only preview must never invent text: each assertion below is the
// exact message the real contract produces for that sample.
describe("previewFieldMessage", () => {
  it("devuelve el mensaje real del correo vacío", () => {
    expect(previewFieldMessage(passwordResetRequestSchema, { email: "" }, "email")).toBe(
      "Ingresá un correo electrónico válido.",
    );
  });

  it("devuelve el mensaje real del correo inválido", () => {
    expect(
      previewFieldMessage(passwordResetRequestSchema, { email: "no-es-un-correo" }, "email"),
    ).toBe("Ingresá un correo electrónico válido.");
  });

  it("no devuelve error para un correo válido", () => {
    expect(
      previewFieldMessage(passwordResetRequestSchema, { email: "persona@correo.com" }, "email"),
    ).toBeNull();
  });

  it("devuelve el mensaje real de la contraseña corta", () => {
    expect(
      previewFieldMessage(updatePasswordFormSchema, { password: "corta", confirm: "corta" }, "password"),
    ).toBe("La contraseña debe tener al menos 8 caracteres.");
  });

  it("devuelve el mensaje real de la confirmación distinta", () => {
    expect(
      previewFieldMessage(
        updatePasswordFormSchema,
        { password: "unaClaveSegura123", confirm: "otraClaveSegura123" },
        "confirm",
      ),
    ).toBe("Las contraseñas no coinciden.");
  });

  it("no devuelve error para un formulario válido", () => {
    expect(
      previewFieldMessage(
        updatePasswordFormSchema,
        { password: "unaClaveSegura123", confirm: "unaClaveSegura123" },
        "password",
      ),
    ).toBeNull();
  });

  it("devuelve null si el campo no tiene errores", () => {
    expect(previewFieldMessage(passwordResetRequestSchema, { email: "" }, "otro")).toBeNull();
  });
});
