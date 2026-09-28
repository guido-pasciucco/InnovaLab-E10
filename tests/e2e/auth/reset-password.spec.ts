import { fakerES as faker } from "@faker-js/faker";
import type { CreatedUser } from "../factories/user";
import { expect, test } from "../fixtures";
import { waitForAuthLink } from "../helpers/mailpit";
import type { ResetPasswordPage } from "../pages/reset-password.page";
import type { Page } from "@playwright/test";

// The reset email links to GoTrue's /auth/v1/verify, which redirects to
// our /auth/confirm with a PKCE `?code=`. /auth/confirm exchanges it for a
// recovery session (cookies) and continues to /update-password.

async function openResetLink(
  page: Page,
  resetPasswordPage: ResetPasswordPage,
  user: CreatedUser,
): Promise<void> {
  await resetPasswordPage.goto();
  await resetPasswordPage.requestLink(user.email);
  await expect(resetPasswordPage.statusMessage).toHaveText(
    "If an account exists for that email, a reset link has been sent.",
  );
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

test("an invalid reset link sends the user back to request a new one", async ({ page, resetPasswordPage }) => {
  // Act
  await page.goto("/auth/confirm?code=not-a-real-code&next=/update-password");

  // Assert
  await expect(page).toHaveURL("/reset-password?error=AUTH_LINK_INVALID");
  await expect(resetPasswordPage.errorAlert).toHaveText(
    "This link is invalid or has expired. Please request a new one",
  );
});

test("the confirm route never redirects off-site", async ({ page }) => {
  // Act: even a failed exchange must not honor an external `next`.
  await page.goto("/auth/confirm?code=not-a-real-code&next=//evil.example");

  // Assert
  await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:3100\//);
});
