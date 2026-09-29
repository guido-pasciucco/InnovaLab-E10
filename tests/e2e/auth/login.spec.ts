import { expect, test } from "../fixtures";

test("a confirmed user logs in and gets a session", async ({ page, user, loginPage }) => {
  // Arrange
  await loginPage.goto();

  // Act
  await loginPage.logIn(user);

  // Assert: the form pushes to "/" and the session cookie set by the Server
  // Action lets the protected page render.
  await expect(page).toHaveURL("/");
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/dashboard");
});

test("wrong credentials show an error and keep the user on /login", async ({ page, user, loginPage }) => {
  // Arrange
  await loginPage.goto();

  // Act
  await loginPage.logIn({ email: user.email, password: `${user.password}-wrong` });

  // Assert
  await expect(loginPage.errorAlert).toBeVisible();
  await expect(page).toHaveURL("/login");
});
