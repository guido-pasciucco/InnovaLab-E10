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
