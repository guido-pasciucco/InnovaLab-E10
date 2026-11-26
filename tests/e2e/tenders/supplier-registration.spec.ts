import { randomValidCuit } from "../../support/factories/supplier";
import { buildUser } from "../../support/factories/user";
import { expect, test } from "../fixtures";
import { waitForAuthLink } from "../helpers/mailpit";

// Issue #309: a new supplier signs up from the public registration page,
// confirms the email and lands on its panel. No invitation, no owner link.
test("un proveedor nuevo se registra sin invitación, confirma el mail y entra a su panel", async ({
  browser,
  cleanup,
}) => {
  const supplier = buildUser();
  cleanup.trackUserEmail(supplier.email);
  const supplierContext = await browser.newContext();
  const page = await supplierContext.newPage();

  // Act: sign up as an anonymous visitor.
  await page.goto("/proveedores/registro");
  await expect(page.getByRole("heading", { name: "Registrate como proveedor" })).toBeVisible();
  await page.getByLabel("Nombre del negocio").fill("Molino San José");
  await page.getByLabel("CUIT").fill(randomValidCuit());
  await page.getByLabel("Persona de contacto").fill("Ana Pérez");
  await page.getByLabel("Teléfono").fill("+54 11 5555-1234");
  await page.getByLabel("Rubros").fill("Harinas");
  await page.getByLabel("Mail", { exact: true }).fill(supplier.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(supplier.password);
  await page.getByRole("checkbox", { name: /Acepto los términos de uso/ }).check();
  await page.getByRole("button", { name: "Crear cuenta de proveedor" }).click();
  await expect(page.getByText("Revisá tu mail")).toBeVisible();

  await page.goto(await waitForAuthLink(supplier.email, "signup"));

  // Assert: the supplier panel, with no tenders yet, and the public registry.
  await expect(page).toHaveURL("/proveedor");
  await expect(page.getByText("Todavía no hay licitaciones activas.")).toBeVisible();

  await supplierContext.close();
});

test("un CUIT con dígito verificador inválido se rechaza sin perder lo cargado", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/proveedores/registro");
  await page.getByLabel("Nombre del negocio").fill("Distribuidora Norte");
  await page.getByLabel("CUIT").fill("20-12345678-0");
  await page.getByRole("button", { name: "Crear cuenta de proveedor" }).click();

  await expect(page.getByLabel("CUIT")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Nombre del negocio")).toHaveValue("Distribuidora Norte");

  await context.close();
});
