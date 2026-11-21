import { randomValidCuit } from "../../support/factories/supplier";
import { buildUser } from "../../support/factories/user";
import { expect, test } from "../fixtures";
import { waitForAuthLink } from "../helpers/mailpit";
import { generateInviteLink } from "../helpers/supplier-invite";

const INVALID_INVITE =
  "Este enlace de invitación ya no sirve: puede haber vencido o ya se usó. Pedile uno nuevo a quien te invitó.";

// docs/licitaciones RN-22, RN-23 (ES-02): a new supplier signs up through
// the emprendedor's personal link, confirms the email and lands on its
// panel. The link works once.
test("un proveedor nuevo se registra con el enlace, confirma el mail y entra a su panel", async ({
  authedPage,
  browser,
  cleanup,
}) => {
  // Arrange: the emprendedor generates the link.
  const link = await generateInviteLink(authedPage, "Molino San José");
  const supplier = buildUser();
  cleanup.trackUserEmail(supplier.email);
  const supplierContext = await browser.newContext();
  const page = await supplierContext.newPage();

  // Act: sign up from the link, as an anonymous visitor.
  await page.goto(link);
  await expect(page.getByRole("heading", { name: /te invita a sus licitaciones/ })).toBeVisible();
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

  // Assert: the supplier panel, the emprendedor's list, and a used link.
  await expect(page).toHaveURL("/proveedor");
  await expect(page.getByText("Todavía no te invitó a ninguna licitación.")).toBeVisible();

  await authedPage.goto("/proveedores");
  await expect(authedPage.getByText("Molino San José").first()).toBeVisible();

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await otherPage.goto(link);
  await expect(otherPage.getByText(INVALID_INVITE)).toBeVisible();

  await supplierContext.close();
  await otherContext.close();
});

test("un CUIT con dígito verificador inválido se rechaza sin perder lo cargado", async ({ authedPage, browser }) => {
  const link = await generateInviteLink(authedPage, "Distribuidora Norte");
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(link);
  await page.getByLabel("Nombre del negocio").fill("Distribuidora Norte");
  await page.getByLabel("CUIT").fill("20-12345678-0");
  await page.getByRole("button", { name: "Crear cuenta de proveedor" }).click();

  await expect(page.getByLabel("CUIT")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Nombre del negocio")).toHaveValue("Distribuidora Norte");

  await context.close();
});
