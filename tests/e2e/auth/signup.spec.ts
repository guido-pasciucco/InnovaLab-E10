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

  // Act: sign up (the form pushes to /login on success) and confirm.
  await signupPage.goto();
  await signupPage.signUp(user);
  await expect(page).toHaveURL("/login");

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
