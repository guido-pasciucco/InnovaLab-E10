import type { Locator, Page } from "@playwright/test";

export class SignupPage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly successDialog: Locator;

  constructor(private readonly page: Page) {
    this.nameInput = page.getByLabel("Nombre y apellido");
    this.emailInput = page.getByLabel("Correo electrónico");
    this.passwordInput = page.getByLabel("Contraseña", { exact: true });
    this.confirmPasswordInput = page.getByLabel("Confirmar contraseña");
    this.submitButton = page.getByRole("button", { name: "Crear cuenta" });
    // The dialog's accessible name comes from its labelled heading.
    this.successDialog = page.getByRole("dialog", { name: "¡Cuenta creada!" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/signup");
  }

  // Fills and submits the form. On success the screen shows an accessible
  // confirmation dialog (no auto redirect); continue to /login with
  // continueToLogin().
  async signUp(user: { displayName: string; email: string; password: string }): Promise<void> {
    await this.nameInput.fill(user.displayName);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    await this.confirmPasswordInput.fill(user.password);
    await this.submitButton.click();
  }

  async continueToLogin(): Promise<void> {
    await this.successDialog.getByRole("link", { name: "Ir a iniciar sesión" }).click();
  }
}
