import { buildUser } from "../../support/factories/user";
import { expect, test } from "../fixtures";
import { waitForAuthLink } from "../helpers/mailpit";

// Signup is the subject here, so the account is created through the UI and
// confirmed with the real Mailpit link (front door end to end).
test("signup, confirm the email through Mailpit, log in and reach the dashboard", async ({
  page,
  cleanup,
  signupPage,
  loginPage,
  dashboardPage,
}) => {
  // Arrange
  const user = buildUser({ displayName: "E2E Signup" });
  cleanup.trackUserEmail(user.email);

  // Act: sign up (success continues to the "check your email" screen) and confirm.
  await signupPage.goto();
  await signupPage.signUp(user);
  await expect(page).toHaveURL("/auth/check-email");
  await expect(page.getByRole("heading", { name: "Revisá tu correo" })).toBeVisible();

  // Email confirmations are ON (supabase/config.toml). With PKCE, GoTrue
  // verifies the email on /auth/v1/verify and redirects to /auth/confirm
  // (emailRedirectTo) with a `?code=`, which the app exchanges for a session
  // before continuing to the "account created" screen.
  await page.goto(await waitForAuthLink(user.email, "signup"));
  await expect(page).toHaveURL("/auth/account-created");
  await expect(page.getByRole("heading", { name: "¡Cuenta creada!" })).toBeVisible();

  await loginPage.goto();
  await loginPage.logIn(user);
  await expect(page).toHaveURL("/");

  // Assert
  await dashboardPage.goto();
  await expect(dashboardPage.heading).toBeVisible();
  await expect(dashboardPage.userEmail(user.email)).toBeVisible();
});
