import { expect, type Page } from "@playwright/test";

import { randomValidCuit } from "../../support/factories/supplier";

// Completes the public supplier registration (issue #309) from a signed-in
// account: no invitation link, no emprendedor selection.
export async function registerSignedInSupplier(page: Page, businessName: string): Promise<string> {
  const cuit = randomValidCuit();
  await page.goto("/proveedores/registro");
  await page.getByLabel("Nombre del negocio").fill(businessName);
  await page.getByLabel("CUIT").fill(cuit);
  await page.getByLabel("Persona de contacto").fill("Ana Pérez");
  await page.getByLabel("Teléfono").fill("+54 11 5555-1234");
  await page.getByLabel("Rubros").fill("Harinas");
  await page.getByRole("checkbox", { name: /Acepto los términos de uso/ }).check();
  await page.getByRole("button", { name: "Registrarme como proveedor" }).click();
  await expect(page).toHaveURL("/proveedor");
  return cuit;
}
