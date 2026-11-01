import type { Locator, Page } from "@playwright/test";

export class VerifyEmailPage {
  readonly heading: Locator;
  readonly checkButton: Locator;
  readonly resendButton: Locator;
  readonly changeEmailLink: Locator;
  readonly status: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Revisá tu correo" });
    this.checkButton = page.getByRole("button", { name: "Ya verifiqué mi correo" });
    this.resendButton = page.getByRole("button", { name: /Reenviar/ });
    this.changeEmailLink = page.getByRole("link", { name: "Cambiar correo" });
    this.status = page.getByRole("status");
  }

  emailText(email: string): Locator {
    return this.page.getByText(email);
  }
}
