import { test as base, expect, type Page } from "@playwright/test";
import { createUser, deleteUser, findUserIdByEmail, type CreatedUser } from "../support/factories/user";
import { signInSessionCookies } from "./helpers/session";
import { DashboardPage } from "./pages/dashboard.page";
import { LoginPage } from "./pages/login.page";
import { ResetPasswordPage } from "./pages/reset-password.page";
import { SignupPage } from "./pages/signup.page";
import { UpdatePasswordPage } from "./pages/update-password.page";

// Every spec imports `test` and `expect` from here.
//
// "Arrange via the back door, act via the front door": data fixtures
// (`user`, `authedPage`) set up preconditions without the UI; only the spec
// that owns a flow drives it through the page objects. All fixtures are
// test-scoped and delete what they create in teardown.

type Cleanup = {
  // Registers an account created outside the factory (e.g. through the
  // signup UI) so it is deleted after the test, even if the test fails.
  trackUserEmail(email: string): void;
};

type Fixtures = {
  cleanup: Cleanup;
  // A confirmed user created through the Admin API.
  user: CreatedUser;
  // The test's `page`, already signed in as `user`. Page-object fixtures
  // wrap that same `page`, so they act as the signed-in user too.
  authedPage: Page;
  loginPage: LoginPage;
  signupPage: SignupPage;
  dashboardPage: DashboardPage;
  resetPasswordPage: ResetPasswordPage;
  updatePasswordPage: UpdatePasswordPage;
};

// The fixture callback is named `provide` (Playwright docs call it `use`)
// because eslint's react-hooks rule treats any `use(...)` call as React's.
export const test = base.extend<Fixtures>({
  cleanup: async ({}, provide) => {
    const emails: string[] = [];
    await provide({ trackUserEmail: (email) => emails.push(email) });
    for (const email of emails) {
      const id = await findUserIdByEmail(email);
      if (id) await deleteUser(id);
    }
  },

  user: async ({}, provide) => {
    const user = await createUser();
    await provide(user);
    await deleteUser(user.id);
  },

  // Back-door login: signs in via `@supabase/ssr` in the test process and
  // injects the resulting auth cookies into the browser context. Same
  // library and key as the app, so the cookie format cannot drift; it skips
  // the login UI, which login.spec.ts covers.
  authedPage: async ({ page, context, user, baseURL }, provide) => {
    if (!baseURL) throw new Error("[e2e] authedPage needs `use.baseURL`.");
    const cookies = await signInSessionCookies(user.email, user.password);
    const now = Math.floor(Date.now() / 1000);
    await context.addCookies(
      cookies.map(({ name, value, maxAge, sameSite }) => ({
        name,
        value,
        url: baseURL,
        sameSite,
        expires: maxAge ? now + maxAge : -1,
      })),
    );
    await provide(page);
  },

  loginPage: async ({ page }, provide) => provide(new LoginPage(page)),
  signupPage: async ({ page }, provide) => provide(new SignupPage(page)),
  dashboardPage: async ({ page }, provide) => provide(new DashboardPage(page)),
  resetPasswordPage: async ({ page }, provide) => provide(new ResetPasswordPage(page)),
  updatePasswordPage: async ({ page }, provide) => provide(new UpdatePasswordPage(page)),
});

export { expect };
