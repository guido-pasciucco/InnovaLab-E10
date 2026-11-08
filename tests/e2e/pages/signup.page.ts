import type { Locator, Page } from "@playwright/test";

export class SignupPage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.nameInput = page.getByLabel("Nombre y apellido");
    this.emailInput = page.getByLabel("Correo electrónico");
    this.passwordInput = page.getByLabel("Contraseña", { exact: true });
    this.confirmPasswordInput = page.getByLabel("Confirmar contraseña");
    this.submitButton = page.getByRole("button", { name: "Crear cuenta" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/signup");
  }

  // Fills and submits the form. On success the app continues to
  // /auth/check-email.
  async signUp(user: { displayName: string; email: string; password: string }): Promise<void> {
    await this.nameInput.fill(user.displayName);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    await this.confirmPasswordInput.fill(user.password);
    await this.submitButton.click();
  }
}
