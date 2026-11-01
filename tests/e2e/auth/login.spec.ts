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

test("the password visibility toggle is keyboard accessible", async ({ page, loginPage }) => {
  // Arrange
  await loginPage.goto();
  await loginPage.passwordInput.fill("secreto-de-prueba");

  // Act
  await loginPage.passwordToggle.focus();
  await page.keyboard.press("Enter");

  // Assert
  await expect(loginPage.passwordInput).toHaveAttribute("type", "text");
  await expect(loginPage.passwordToggle).toHaveAttribute("aria-label", "Ocultar contraseña");

  // Act: the same control hides it again.
  await page.keyboard.press("Enter");
  await expect(loginPage.passwordInput).toHaveAttribute("type", "password");
  await expect(loginPage.passwordToggle).toHaveAttribute("aria-label", "Mostrar contraseña");
});

test("the secondary links navigate to recovery and signup", async ({ page, loginPage }) => {
  // Arrange
  await loginPage.goto();

  // Act: forgot password.
  await loginPage.forgotPasswordLink.click();
  await expect(page).toHaveURL("/reset-password");

  // Act: create account (back to the login screen first).
  await page.goto("/login");
  await loginPage.signupLink.click();
  await expect(page).toHaveURL("/signup");
});

test("a user can continue without an account", async ({ page, loginPage }) => {
  // Arrange
  await loginPage.goto();

  // Act
  await loginPage.continueWithoutAccountLink.click();

  // Assert: the calculator home is public.
  await expect(page).toHaveURL("/");
});
