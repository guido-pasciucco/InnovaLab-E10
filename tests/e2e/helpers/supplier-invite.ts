import { expect, type Page } from "@playwright/test";

// Generates a personal supplier invite link from the emprendedor's
// /proveedores screen (docs/flujos/09-licitaciones.md RN-23) and returns it. The link is
// shown only once, in a read-only field.
export async function generateInviteLink(ownerPage: Page, label: string): Promise<string> {
  await ownerPage.goto("/proveedores");
  await ownerPage.getByLabel("¿Para quién es el enlace?").fill(label);
  await ownerPage.getByRole("button", { name: "Generar enlace" }).click();

  const field = ownerPage.getByRole("textbox", { name: "Enlace de invitación" });
  await expect(field).toHaveValue(/\/proveedores\/invitacion\/[A-Za-z0-9_-]{43}$/);
  return field.inputValue();
}
