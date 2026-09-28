import { expect, test } from "../fixtures";

test("signing out ends the session", async ({ authedPage, dashboardPage }) => {
  // Arrange
  await dashboardPage.goto();
  await expect(dashboardPage.heading).toBeVisible();

  // Act
  await dashboardPage.signOut();

  // Assert: back on /login, and the protected page now bounces there too.
  await expect(authedPage).toHaveURL("/login");
  await dashboardPage.goto();
  await expect(authedPage).toHaveURL("/login");
});
