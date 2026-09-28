import type { Locator, Page } from "@playwright/test";

export class ResetPasswordPage {
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly statusMessage: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel("Email");
    this.submitButton = page.getByRole("button", { name: "Send reset link" });
    this.statusMessage = page.getByRole("status");
  }

  async goto(): Promise<void> {
    await this.page.goto("/reset-password");
  }

  async requestLink(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }
}
