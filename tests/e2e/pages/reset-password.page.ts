import type { Locator, Page } from "@playwright/test";

export class ResetPasswordPage {
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly statusMessage: Locator;
  readonly errorAlert: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel("Email");
    this.submitButton = page.getByRole("button", { name: "Send reset link" });
    this.statusMessage = page.getByRole("status");
    // Scoped to <main>: Next also renders an empty role=alert route
    // announcer outside it, which would make a page-wide query ambiguous.
    this.errorAlert = page.getByRole("main").getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.page.goto("/reset-password");
  }

  async requestLink(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }
}
