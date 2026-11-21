import type { Locator, Page } from "@playwright/test";

export class ResetPasswordPage {
  readonly emailInput: Locator;
  readonly emailError: Locator;
  readonly submitButton: Locator;
  readonly statusMessage: Locator;
  readonly requestAnotherLink: Locator;
  readonly loginLink: Locator;
  readonly errorAlert: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel("Correo electrónico");
    this.emailError = page.locator("#email-error");
    this.submitButton = page.getByRole("button", { name: "Enviar enlace" });
    this.statusMessage = page.getByRole("status");
    // The success panel action remounts the form in place (no navigation),
    // so it is a button, not a link.
    this.requestAnotherLink = page.getByRole("button", { name: "Solicitar otro enlace" });
    this.loginLink = page.getByRole("link", { name: "Ir a iniciar sesión" });
    // Scoped to <main>: Next also renders an empty role=alert route
    // announcer outside it, which would make a page-wide query ambiguous.
    // `.first()` keeps the page-level link error when a field error is
    // also present; field errors have their own locator by id.
    this.errorAlert = page.getByRole("main").getByRole("alert").first();
  }

  async goto(): Promise<void> {
    await this.page.goto("/reset-password");
  }

  async requestLink(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }
}
