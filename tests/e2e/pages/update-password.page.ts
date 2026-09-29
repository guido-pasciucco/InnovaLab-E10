import type { Locator, Page } from "@playwright/test";

export class UpdatePasswordPage {
  readonly heading: Locator;
  readonly passwordInput: Locator;
  readonly confirmInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole("heading", { name: "Set new password" });
    this.passwordInput = page.getByLabel("New password");
    this.confirmInput = page.getByLabel("Confirm password");
    this.submitButton = page.getByRole("button", { name: "Update password" });
    this.successMessage = page.getByRole("status");
    // Scoped to <main>: Next also renders an empty role=alert route
    // announcer outside it, which would make a page-wide query ambiguous.
    this.errorAlert = page.getByRole("main").getByRole("alert");
  }

  async setPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
    await this.confirmInput.fill(password);
    await this.submitButton.click();
  }
}
