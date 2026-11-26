import { buildUser } from "../../support/factories/user";
import { expect, test } from "../fixtures";
import { waitForAuthLink } from "../helpers/mailpit";

// The two migrated buttons are the subject here, so each test signs up its
// own fresh account through the UI and lets the app land on /auth/check-email.
test("a new user resends the confirmation email and sees the cooldown", async ({
  page,
  cleanup,
  signupPage,
}) => {
  // Arrange
  const user = buildUser({ displayName: "E2E Check Email Resend" });
  cleanup.trackUserEmail(user.email);
  await signupPage.goto();
  await signupPage.signUp(user);
  await expect(page).toHaveURL("/auth/check-email");

  // The name changes to "Enviando…" while the action runs, then back to the
  // countdown, so the locator must survive both labels.
  const resendButton = page.getByRole("button", { name: /^(Reenviar correo|Enviando…)/ });
  await expect(resendButton).toBeVisible();

  // GoTrue rejects a resend that lands in the same second as the signup email.
  await page.waitForTimeout(1500);

  // Act
  await resendButton.click();

  // Assert
  await expect(resendButton).toBeDisabled();
  await expect(resendButton).toHaveText(/^Reenviar correo \(60s\)$/);
  await expect(
    page.getByRole("status").filter({ hasText: "Te lo reenviamos. Revisá tu bandeja de entrada." }),
  ).toBeVisible();
});

test("a new user learns the email is still unconfirmed before following the link", async ({
  page,
  cleanup,
  signupPage,
}) => {
  // Arrange
  const user = buildUser({ displayName: "E2E Check Email Pending" });
  cleanup.trackUserEmail(user.email);
  await signupPage.goto();
  await signupPage.signUp(user);
  await expect(page).toHaveURL("/auth/check-email");

  const verifiedButton = page.getByRole("button", { name: /^(Ya verifiqué mi correo|Verificando…)/ });
  await expect(verifiedButton).toBeVisible();

  // Act
  await verifiedButton.click();

  // Assert
  await expect(
    page.getByRole("status").filter({ hasText: "Todavía no figura confirmado." }),
  ).toBeVisible();
});

test("a user whose email is confirmed advances from the check-email screen", async ({
  page,
  cleanup,
  signupPage,
}) => {
  // Arrange
  const user = buildUser({ displayName: "E2E Check Email Confirmed" });
  cleanup.trackUserEmail(user.email);
  await signupPage.goto();
  await signupPage.signUp(user);
  await expect(page).toHaveURL("/auth/check-email");

  // Act: the Mailpit link performs the PKCE exchange that creates the session;
  // only then can the button report the address as confirmed.
  await page.goto(await waitForAuthLink(user.email, "signup"));
  await expect(page).toHaveURL("/auth/account-created");

  await page.goto("/auth/check-email");
  const verifiedButton = page.getByRole("button", { name: /^(Ya verifiqué mi correo|Verificando…)/ });
  await verifiedButton.click();

  // Assert
  await expect(page).toHaveURL("/auth/account-created");
});
