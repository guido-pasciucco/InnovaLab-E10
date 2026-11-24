import { randomValidCuit } from "../../support/factories/supplier";
import { createUser } from "../../support/factories/user";
import { expect, signInContext, test } from "../fixtures";
import { generateInviteLink } from "../helpers/supplier-invite";
import { LoginPage } from "../pages/login.page";

test("an anonymous visitor is redirected from /inicio to /login", async ({ page }) => {
  await page.goto("/inicio");

  await expect(page).toHaveURL("/login");
});

test("the old /dashboard URL takes a signed-in emprendedor to the home page", async ({ authedPage }) => {
  await authedPage.goto("/dashboard");

  await expect(authedPage).toHaveURL("/inicio");
  await expect(authedPage.getByRole("heading", { name: "Bienvenida", level: 1 })).toBeVisible();
});

test("the home header links a signed-in user into the app instead of Iniciar sesión", async ({ authedPage }) => {
  await authedPage.goto("/");

  const banner = authedPage.getByRole("banner");
  await expect(banner.getByRole("link", { name: "Iniciar sesión" })).toHaveCount(0);
  await banner.getByRole("link", { name: "Dashboard" }).click();

  await expect(authedPage).toHaveURL("/inicio");
});

test("a supplier-only account logs in through the form and lands on its panel", async ({
  authedPage,
  browser,
  cleanup,
  baseURL,
}) => {
  // Arrange: an account that only completed its supplier data through an invite.
  const link = await generateInviteLink(authedPage, "Molino San José");
  const supplier = await createUser();
  cleanup.trackUserEmail(supplier.email);
  const registration = await browser.newContext();
  await signInContext(registration, supplier, baseURL!);
  const registrationPage = await registration.newPage();
  await registrationPage.goto(link);
  await registrationPage.getByLabel("Nombre del negocio").fill("Molino San José");
  await registrationPage.getByLabel("CUIT").fill(randomValidCuit());
  await registrationPage.getByLabel("Persona de contacto").fill("Ana Pérez");
  await registrationPage.getByLabel("Teléfono").fill("+54 11 5555-1234");
  await registrationPage.getByLabel("Rubros").fill("Harinas");
  await registrationPage.getByRole("checkbox", { name: /Acepto los términos de uso/ }).check();
  await registrationPage.getByRole("button", { name: "Registrarme como proveedor" }).click();
  await expect(registrationPage).toHaveURL("/proveedor");
  await registration.close();

  // Act: a fresh session signs in through the login form.
  const loginContext = await browser.newContext();
  const page = await loginContext.newPage();
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.logIn(supplier);

  // Assert
  await expect(page).toHaveURL("/proveedor");
  await loginContext.close();
});
