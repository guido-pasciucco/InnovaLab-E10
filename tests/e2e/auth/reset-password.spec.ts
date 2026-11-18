import { fakerES as faker } from "@faker-js/faker";
import { buildUser, type CreatedUser } from "../../support/factories/user";
import { expect, test } from "../fixtures";
import { waitForAuthLink } from "../helpers/mailpit";
import type { ResetPasswordPage } from "../pages/reset-password.page";
import type { Page } from "@playwright/test";

// The reset email links to GoTrue's /auth/v1/verify, which redirects to
// our /auth/confirm with a PKCE `?code=`. /auth/confirm exchanges it for a
// recovery session (cookies) and continues to /update-password.

const NEUTRAL_CONFIRMATION =
  "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña.";
const INVALID_LINK_MESSAGE = "El enlace no es válido o venció. Pedí uno nuevo para continuar.";
const SESSION_MISSING_MESSAGE = "Tu sesión venció. Pedí un enlace nuevo para continuar.";

async function openResetLink(
  page: Page,
  resetPasswordPage: ResetPasswordPage,
  user: CreatedUser,
): Promise<void> {
  await resetPasswordPage.goto();
  await resetPasswordPage.requestLink(user.email);
  // The panel is a container: assert on the neutral copy, not the whole text.
  await expect(resetPasswordPage.statusMessage).toContainText(NEUTRAL_CONFIRMATION);
  await page.goto(await waitForAuthLink(user.email, "recovery"));
}

test("the reset email exchanges the code and lands on /update-password", async ({
  page,
  user,
  resetPasswordPage,
  updatePasswordPage,
}) => {
  // Act
  await openResetLink(page, resetPasswordPage, user);

  // Assert: the code was consumed by /auth/confirm, not left in the URL.
  await expect(page).toHaveURL("/update-password");
  await expect(updatePasswordPage.heading).toBeVisible();
});

test("a user sets a new password from the reset email", async ({
  page,
  user,
  resetPasswordPage,
  updatePasswordPage,
  loginPage,
}) => {
  // Arrange
  await openResetLink(page, resetPasswordPage, user);

  // Act
  const newPassword = faker.internet.password({ length: 16 });
  await updatePasswordPage.setPassword(newPassword);

  // Assert: the form redirects to /login right after the update, so the
  // transient success message is not asserted (it races the redirect).
  await expect(page).toHaveURL("/login", { timeout: 10_000 });
  await loginPage.logIn({ email: user.email, password: newPassword });
  await expect(page).toHaveURL("/");
});

test("an unknown email gets the same neutral confirmation and no form", async ({
  page,
  resetPasswordPage,
}) => {
  // Arrange: an address with no account must not reveal that it is unknown.
  await resetPasswordPage.goto();

  // Act: a valid address that was never created in Supabase.
  await resetPasswordPage.requestLink(buildUser().email);

  // Assert: same copy and same next steps as a real account.
  await expect(resetPasswordPage.statusMessage).toContainText(NEUTRAL_CONFIRMATION);
  await expect(resetPasswordPage.loginLink).toBeVisible();
  await expect(resetPasswordPage.loginLink).toHaveAttribute("href", "/login");
  await expect(resetPasswordPage.requestAnotherLink).toBeVisible();
  await expect(resetPasswordPage.emailInput).toHaveCount(0);
  await expect(page).toHaveURL("/reset-password");
});

test("the success panel's request-another-link CTA returns to a clean form", async ({
  page,
  resetPasswordPage,
}) => {
  // Arrange: reach the success panel with an address that has no account
  // (the neutral confirmation is identical, anti-enumeration).
  await resetPasswordPage.goto();
  await resetPasswordPage.requestLink(buildUser().email);
  await expect(resetPasswordPage.statusMessage).toContainText(NEUTRAL_CONFIRMATION);

  // Act: the CTA remounts the form in place, without navigating.
  await resetPasswordPage.requestAnotherLink.click();

  // Assert: the form is back, empty and with no leftover success panel.
  await expect(resetPasswordPage.emailInput).toBeVisible();
  await expect(resetPasswordPage.emailInput).toHaveValue("");
  await expect(resetPasswordPage.statusMessage).toHaveCount(0);
  await expect(page).toHaveURL("/reset-password");

  // Act: a second request works and shows the neutral confirmation again.
  await resetPasswordPage.requestLink(buildUser().email);

  // Assert: no false success and the same neutral copy.
  await expect(resetPasswordPage.statusMessage).toContainText(NEUTRAL_CONFIRMATION);
  await expect(resetPasswordPage.emailInput).toHaveCount(0);
});

test("a successful request dismisses a stale invalid-link alert", async ({
  page,
  resetPasswordPage,
}) => {
  // Arrange: land with the code /auth/confirm sends for a bad link.
  await page.goto("/reset-password?error=AUTH_LINK_INVALID");
  await expect(resetPasswordPage.errorAlert).toHaveText(INVALID_LINK_MESSAGE);

  // Act: request a new link from that screen.
  await resetPasswordPage.requestLink(buildUser().email);

  // Assert: the confirmation replaces the form and the old alert is gone.
  await expect(resetPasswordPage.statusMessage).toContainText(NEUTRAL_CONFIRMATION);
  await expect(resetPasswordPage.errorAlert).toHaveCount(0);

  // Act: going back to the form must not resurrect the stale alert.
  await resetPasswordPage.requestAnotherLink.click();

  // Assert
  await expect(resetPasswordPage.emailInput).toBeVisible();
  await expect(resetPasswordPage.errorAlert).toHaveCount(0);
});

test("an invalid email is rejected in the client with the shared message", async ({
  page,
  resetPasswordPage,
}) => {
  // Arrange
  await resetPasswordPage.goto();

  // Act: RHF validates with the same schema the service uses.
  await resetPasswordPage.requestLink("no-es-un-correo");

  // Assert: the form stays put and no confirmation replaces it.
  await expect(resetPasswordPage.emailError).toHaveText(
    "Ingresá un correo electrónico válido.",
  );
  await expect(resetPasswordPage.statusMessage).toHaveCount(0);
  await expect(page).toHaveURL("/reset-password");
});

test("password rules, show/hide toggles and the confirm match are enforced", async ({
  page,
  user,
  resetPasswordPage,
  updatePasswordPage,
}) => {
  // Arrange
  await openResetLink(page, resetPasswordPage, user);
  await expect(page).toHaveURL("/update-password");
  await expect(updatePasswordPage.heading).toBeVisible();

  // Act: a short password is caught by the shared field rule.
  await updatePasswordPage.passwordInput.fill("corta");
  await updatePasswordPage.confirmInput.fill("corta");
  await updatePasswordPage.submitButton.click();
  await expect(updatePasswordPage.passwordError).toHaveText(
    "La contraseña debe tener al menos 8 caracteres.",
  );

  // Act: each eye button flips only its own input and announces the state.
  const password = "unaClaveSegura123";
  await updatePasswordPage.passwordInput.fill(password);
  await expect(updatePasswordPage.passwordInput).toHaveAttribute("type", "password");
  await updatePasswordPage.togglePasswordVisibility();
  await expect(updatePasswordPage.passwordInput).toHaveAttribute("type", "text");
  await expect(updatePasswordPage.showPasswordButton).toHaveAttribute("aria-pressed", "true");
  await expect(updatePasswordPage.showPasswordButton).toHaveAttribute(
    "aria-label",
    "Ocultar contraseña",
  );
  await updatePasswordPage.togglePasswordVisibility();
  await expect(updatePasswordPage.passwordInput).toHaveAttribute("type", "password");

  await updatePasswordPage.confirmInput.fill("otraClaveDistinta123");
  await updatePasswordPage.toggleConfirmVisibility();
  await expect(updatePasswordPage.confirmInput).toHaveAttribute("type", "text");
  await updatePasswordPage.toggleConfirmVisibility();
  await expect(updatePasswordPage.confirmInput).toHaveAttribute("type", "password");

  // Assert: the confirm-match check is form-only, so nothing was submitted.
  await updatePasswordPage.submitButton.click();
  await expect(updatePasswordPage.confirmError).toHaveText("Las contraseñas no coinciden.");
  await expect(page).toHaveURL("/update-password");
});

test("submitting without a recovery session asks for a new link", async ({
  page,
  updatePasswordPage,
}) => {
  // Arrange: /update-password renders without a session; the Server Action
  // must refuse to update a password for an anonymous caller.
  await updatePasswordPage.goto();
  await expect(updatePasswordPage.heading).toBeVisible();

  // Act
  await updatePasswordPage.setPassword(faker.internet.password({ length: 16 }));

  // Assert
  await expect(updatePasswordPage.errorAlert).toContainText(SESSION_MISSING_MESSAGE);
  await expect(updatePasswordPage.newLink).toBeVisible();
  await expect(updatePasswordPage.newLink).toHaveAttribute("href", "/reset-password");
  await expect(page).toHaveURL("/update-password");
});

test("an invalid reset link sends the user back to request a new one", async ({
  page,
  resetPasswordPage,
}) => {
  // Act
  await page.goto("/auth/confirm?code=not-a-real-code&next=/update-password");

  // Assert
  await expect(page).toHaveURL("/reset-password?error=AUTH_LINK_INVALID");
  await expect(resetPasswordPage.errorAlert).toHaveText(INVALID_LINK_MESSAGE);
});

test("the confirm route never redirects off-site", async ({ page }) => {
  // Act: even a failed exchange must not honor an external `next`.
  await page.goto("/auth/confirm?code=not-a-real-code&next=//evil.example");

  // Assert
  await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:3100\//);
});

test("the dev-only error preview control never ships in production", async ({
  page,
  resetPasswordPage,
  updatePasswordPage,
}) => {
  // E2E runs against a production build (NODE_ENV=production), so the QA
  // control must not exist in the DOM of either recovery screen.
  await resetPasswordPage.goto();
  await expect(page.getByRole("button", { name: /errores \(demo\)/i })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Escenarios de error (demo)" })).toHaveCount(0);

  await updatePasswordPage.goto();
  await expect(updatePasswordPage.heading).toBeVisible();
  await expect(page.getByRole("button", { name: /errores \(demo\)/i })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Escenarios de error (demo)" })).toHaveCount(0);
});
