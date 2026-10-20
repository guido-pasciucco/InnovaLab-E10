import { expect, test } from "../fixtures";

// /update-password only makes sense inside a recovery session, which
// /auth/confirm creates. Without one the page sends the user back to
// request a new link, instead of rendering a form whose submission is
// doomed to fail.
//
// The recovery flow itself (the link lands on the form and the password can
// be changed) is covered by reset-password.spec.ts.

test("an anonymous visitor is redirected from /update-password to the reset request page", async ({
  page,
  updatePasswordPage,
  resetPasswordPage,
}) => {
  // Act
  await updatePasswordPage.goto();

  // Assert
  await expect(page).toHaveURL("/reset-password?error=AUTH_SESSION_MISSING");
  await expect(resetPasswordPage.errorAlert).toHaveText(
    "Your session has expired. Please request a new link",
  );
});
