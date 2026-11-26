import { createUser } from "../../support/factories/user";
import { expect, signInContext, test } from "../fixtures";
import { registerSignedInSupplier } from "../helpers/supplier-registration";
import { LoginPage } from "../pages/login.page";

test("an anonymous visitor is redirected from /inicio to /login", async ({ page }) => {
  await page.goto("/inicio");

  await expect(page).toHaveURL("/login");
});

test("the old /dashboard URL takes a signed-in emprendedor to the home page", async ({ authedPage }) => {
  await authedPage.goto("/dashboard");

  await expect(authedPage).toHaveURL("/inicio");
  await expect(authedPage.getByRole("heading", { name: /^Hola\b/, level: 1 })).toBeVisible();
});

test("the home header links a signed-in user into the app instead of Iniciar sesión", async ({ authedPage }) => {
  await authedPage.goto("/");

  const banner = authedPage.getByRole("banner");
  await expect(banner.getByRole("link", { name: "Iniciar sesión" })).toHaveCount(0);
  await banner.getByRole("link", { name: "Ir a mi negocio" }).click();

  await expect(authedPage).toHaveURL("/inicio");
});

test("a supplier-only account logs in through the form and lands on its panel", async ({ browser, cleanup, baseURL }) => {
  // Arrange: an account that only completed its supplier data publicly.
  const supplier = await createUser();
  cleanup.trackUserEmail(supplier.email);
  const registration = await browser.newContext();
  await signInContext(registration, supplier, baseURL!);
  const registrationPage = await registration.newPage();
  await registerSignedInSupplier(registrationPage, "Molino San José");
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
