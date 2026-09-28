import { fakerES as faker } from "@faker-js/faker";
import type { CreatedUser } from "../factories/user";
import { expect, test } from "../fixtures";
import { waitForAuthLink } from "../helpers/mailpit";
import type { ResetPasswordPage } from "../pages/reset-password.page";
import type { Page } from "@playwright/test";

// Known bug (issue #49 context): the reset flow never exchanges the PKCE
// code. `redirectTo` points straight at /update-password and there is no
// callback route calling `exchangeCodeForSession`, so the user lands there
// without a recovery session and `updateUser` fails.
//
// How the expected failure is pinned: `test.fail()` alone only says "this
// goes red", for ANY reason (a broken selector would also count). So the
// bug is pinned by passing siblings instead:
//   1. the link lands on /update-password with an unexchanged `?code=`;
//   2. submitting there shows "Could not update password" (role=alert),
//      i.e. the action ran and `updateUser` was rejected (no session).
// Both share the exact steps and locators of the expected-fail test. If a
// selector or the setup breaks, a sibling goes red too; if only the
// expected-fail test flips (starts passing), the bug itself changed.

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

test("the reset email lands on /update-password with an unexchanged PKCE code", async ({
  page,
  user,
  resetPasswordPage,
  updatePasswordPage,
}) => {
  // Act
  await openResetLink(page, resetPasswordPage, user);

  // Assert
  await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:3100\/update-password\?code=/);
  await expect(updatePasswordPage.heading).toBeVisible();
});

test("updating the password from the reset link fails for lack of a session (bug #49)", async ({
  page,
  user,
  resetPasswordPage,
  updatePasswordPage,
}) => {
  // Arrange
  await openResetLink(page, resetPasswordPage, user);

  // Act
  await updatePasswordPage.setPassword(faker.internet.password({ length: 16 }));

  // Assert: the server rejected the update (AUTH_PASSWORD_UPDATE_FAILED),
  // not a client-side validation error.
  await expect(updatePasswordPage.errorAlert).toHaveText("Could not update password");
  await expect(updatePasswordPage.successMessage).toBeHidden();
});

test("a user sets a new password from the reset email", async ({
  page,
  user,
  resetPasswordPage,
  updatePasswordPage,
  loginPage,
}) => {
  // Expected to fail until the PKCE code exchange exists (known bug, do not
  // skip). If this ever passes, the bug changed: tell the team.
  test.fail(true, "Reset never exchanges the PKCE code for a session (issue #49)");

  // Arrange
  await openResetLink(page, resetPasswordPage, user);

  // Act
  const newPassword = faker.internet.password({ length: 16 });
  await updatePasswordPage.setPassword(newPassword);

  // Assert
  await expect(updatePasswordPage.successMessage).toHaveText("Password updated. Redirecting to sign in…", {
    timeout: 10_000,
  });
  await loginPage.goto();
  await loginPage.logIn({ email: user.email, password: newPassword });
  await expect(page).toHaveURL("/");
});
