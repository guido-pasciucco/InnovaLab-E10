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

test("the password visibility toggle works with Enter and Space", async ({ page, loginPage }) => {
  // Arrange
  await loginPage.goto();
  await loginPage.passwordInput.fill("secreto-de-prueba");
  await loginPage.passwordToggle.focus();

  // Act: Enter shows the password.
  await page.keyboard.press("Enter");
  await expect(loginPage.passwordInput).toHaveAttribute("type", "text");
  await expect(loginPage.passwordToggle).toHaveAttribute("aria-label", "Ocultar contraseña");

  // Act: Space hides it again.
  await page.keyboard.press("Space");
  await expect(loginPage.passwordInput).toHaveAttribute("type", "password");
  await expect(loginPage.passwordToggle).toHaveAttribute("aria-label", "Mostrar contraseña");
});

test("a transport failure shows a connection banner that clears when the user edits a field", async ({
  page,
  loginPage,
}) => {
  // Arrange: the Server Action request never reaches the server.
  await page.route("**/login", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await route.abort("failed");
      return;
    }
    await route.continue();
  });
  await loginPage.goto();

  try {
    // Act
    await loginPage.logIn({ email: "alguien@example.com", password: "secreto-de-prueba" });

    // Assert
    await expect(loginPage.errorAlert).toContainText("Revisá tu conexión");
    await expect(page).toHaveURL("/login");

    // Act: editing a field dismisses the stale banner.
    await loginPage.emailInput.fill("otro@example.com");
    await expect(loginPage.errorAlert).toHaveCount(0);
  } finally {
    // A test timeout may already have closed the context and its routes.
    if (!page.isClosed()) {
      await page.unrouteAll({ behavior: "wait" });
    }
  }
});

test("the forgot-password link navigates to recovery", async ({ page, loginPage }) => {
  // Arrange
  await loginPage.goto();

  // Act
  await loginPage.forgotPasswordLink.click();

  // Assert
  await expect(page).toHaveURL("/reset-password");
});

test("the signup link navigates to account creation", async ({ page, loginPage }) => {
  // Arrange
  await loginPage.goto();

  // Act
  await loginPage.signupLink.click();

  // Assert
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
