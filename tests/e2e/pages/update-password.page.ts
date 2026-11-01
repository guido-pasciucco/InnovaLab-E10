import type { Locator, Page } from "@playwright/test";

export class UpdatePasswordPage {
  readonly heading: Locator;
  readonly passwordInput: Locator;
  readonly confirmInput: Locator;
  readonly showPasswordButton: Locator;
  readonly showConfirmButton: Locator;
  readonly passwordError: Locator;
  readonly confirmError: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly newLink: Locator;
  readonly errorAlert: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Nueva contraseña", exact: true });
    // Scope to the textbox: the page also has a region and a list whose
    // accessible names contain "Nueva contraseña".
    this.passwordInput = page.getByRole("textbox", { name: "Nueva contraseña", exact: true });
    this.confirmInput = page.getByRole("textbox", { name: "Confirmar contraseña", exact: true });
    // The toggle buttons share the same accessible name, so target them by
    // the input they control instead of relying on DOM order.
    this.showPasswordButton = page.locator('button[aria-controls="password"]');
    this.showConfirmButton = page.locator('button[aria-controls="confirm"]');
    this.passwordError = page.locator("#password-error");
    this.confirmError = page.locator("#confirm-error");
    this.submitButton = page.getByRole("button", { name: "Guardar contraseña" });
    this.successMessage = page.getByRole("status");
    // The footer also links to /reset-password; the session-expired CTA is
    // the one rendered inside the form, next to the error.
    this.newLink = page.locator("form").getByRole("link", { name: "Solicitar un enlace nuevo" });
    // Scoped to <main>: Next also renders an empty role=alert route
    // announcer outside it, which would make a page-wide query ambiguous.
    // `.first()` keeps the generic server error when a field error is also
    // present; field errors have their own locator by id.
    this.errorAlert = page.getByRole("main").getByRole("alert").first();
  }

  async goto(): Promise<void> {
    await this.page.goto("/update-password");
  }

  async setPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
    await this.confirmInput.fill(password);
    await this.submitButton.click();
  }

  async togglePasswordVisibility(): Promise<void> {
    await this.showPasswordButton.click();
  }

  async toggleConfirmVisibility(): Promise<void> {
    await this.showConfirmButton.click();
  }
}
