import type { Locator, Page } from "@playwright/test";

export class SignupPage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.nameInput = page.getByLabel("Name");
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Create account" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/signup");
  }

  // On success the form pushes to /login.
  async signUp(user: { displayName: string; email: string; password: string }): Promise<void> {
    await this.nameInput.fill(user.displayName);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    await this.submitButton.click();
  }
}
