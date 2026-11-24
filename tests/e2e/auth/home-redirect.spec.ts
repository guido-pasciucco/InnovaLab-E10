import { expect, test } from "../fixtures";

test("an anonymous visitor is redirected from /inicio to /login", async ({ page }) => {
  await page.goto("/inicio");

  await expect(page).toHaveURL("/login");
});

test("the old /dashboard URL takes a signed-in emprendedor to flow 1", async ({ authedPage }) => {
  await authedPage.goto("/dashboard");

  await expect(authedPage).toHaveURL("/insumos");
});

test("the home header links a signed-in user into the app instead of Iniciar sesión", async ({ authedPage }) => {
  await authedPage.goto("/");

  const banner = authedPage.getByRole("banner");
  await expect(banner.getByRole("link", { name: "Iniciar sesión" })).toHaveCount(0);
  await banner.getByRole("link", { name: "Dashboard" }).click();

  await expect(authedPage).toHaveURL("/insumos");
});
