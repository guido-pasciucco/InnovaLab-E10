import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel("Correo electrónico");
    this.passwordInput = page.getByLabel("Contraseña");
    this.submitButton = page.getByRole("button", { name: "Ingresar" });
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
