import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordToggle: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly continueWithoutAccountLink: Locator;
  readonly signupLink: Locator;
  readonly errorAlert: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel("Correo electrónico");
    // Exact: the show/hide button's name also contains "contraseña".
    this.passwordInput = page.getByLabel("Contraseña", { exact: true });
    // Matches both states: "Mostrar contraseña" and "Ocultar contraseña".
    this.passwordToggle = page.getByRole("button", { name: /(mostrar|ocultar) contraseña/i });
    this.submitButton = page.getByRole("button", { name: "Ingresar" });
    this.forgotPasswordLink = page.getByRole("link", { name: "¿Olvidaste tu contraseña?" });
    this.continueWithoutAccountLink = page.getByRole("link", { name: "Continuar sin cuenta" });
    this.signupLink = page.getByRole("link", { name: "Crear cuenta" });
    // Scoped to <main>: Next also renders an empty role=alert route
    // announcer outside it, which would make a page-wide query ambiguous.
    this.errorAlert = page.getByRole("main").getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  // Fills and submits the form. On success the form pushes to "/".
  async logIn(credentials: { email: string; password: string }): Promise<void> {
    await this.emailInput.fill(credentials.email);
    await this.passwordInput.fill(credentials.password);
    await this.submitButton.click();
  }
}
