import { expect, test } from "../fixtures";

test("an anonymous visitor is redirected from /dashboard to /login", async ({ page, dashboardPage }) => {
  // Act
  await dashboardPage.goto();

  // Assert
  await expect(page).toHaveURL("/login");
});

test("the dashboard shows the authenticated user", async ({ authedPage, user, dashboardPage }) => {
  // Arrange: `authedPage` is signed in as `user` through the back door.

  // Act
  await dashboardPage.goto();

  // Assert: not bounced to /login, and the page shows who is signed in.
  await expect(authedPage).toHaveURL("/dashboard");
  await expect(dashboardPage.heading).toBeVisible();
  await expect(dashboardPage.userEmail(user.email)).toBeVisible();
});

test("the home header shows Dashboard instead of Iniciar sesión when signed in", async ({ authedPage }) => {
  await authedPage.goto("/");

  const banner = authedPage.getByRole("banner");
  await expect(banner.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(banner.getByRole("link", { name: "Iniciar sesión" })).toHaveCount(0);
});

test("Volver al inicio goes from the dashboard back to the home", async ({ authedPage, dashboardPage }) => {
  await dashboardPage.goto();
  await authedPage.getByRole("link", { name: "Volver al inicio" }).click();

  await expect(authedPage).toHaveURL("/");
});
