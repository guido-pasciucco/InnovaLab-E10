import { buildUser } from "../../support/factories/user";
import { expect, test } from "../fixtures";
import { waitForAuthLink } from "../helpers/mailpit";

// Signup is the subject here, so the account is created through the UI and
// confirmed with the real Mailpit link (front door end to end).
test("signup, confirm the email through Mailpit, log in and reach the dashboard", async ({
  page,
  cleanup,
  signupPage,
  verifyEmailPage,
  loginPage,
  dashboardPage,
}) => {
  // Arrange
  const user = buildUser({ displayName: "E2E Signup" });
  cleanup.trackUserEmail(user.email);

  // Act: sign up and land on the "Revisá tu correo" screen with the email.
  await signupPage.goto();
  await signupPage.signUp(user);
  await expect(page).toHaveURL(/\/signup\/verificar-correo\?email=/);
  await expect(verifyEmailPage.heading).toBeVisible();
  await expect(verifyEmailPage.emailText(user.email)).toBeVisible();
  await expect(verifyEmailPage.resendButton).toBeVisible();
  await expect(verifyEmailPage.changeEmailLink).toBeVisible();

  // "Ya verifiqué" must not claim success without a confirmed session.
  await verifyEmailPage.checkButton.click();
  await expect(verifyEmailPage.status).toContainText("Todavía no figura confirmado");

  // "Cambiar correo" returns to signup with the address prefilled.
  await verifyEmailPage.changeEmailLink.click();
  await expect(page).toHaveURL(/\/signup\?email=/);
  await expect(signupPage.emailInput).toHaveValue(user.email);

  // Back to the verification screen to continue with the email link.
  await page.goBack();
  await expect(page).toHaveURL(/\/signup\/verificar-correo\?email=/);

  // Email confirmations are ON (supabase/config.toml). With PKCE, GoTrue
  // verifies the email on /auth/v1/verify and redirects to the site with a
  // `?code=` that the app never exchanges (known gap, see the reset spec).
  // The email still ends up confirmed, so the flow continues via login.
  await page.goto(await waitForAuthLink(user.email, "signup"));
  await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:3100\/\?code=/);

  await loginPage.goto();
  await loginPage.logIn(user);
  await expect(page).toHaveURL("/");

  // Assert
  await dashboardPage.goto();
  await expect(dashboardPage.heading).toBeVisible();
  await expect(dashboardPage.userEmail(user.email)).toBeVisible();
});
