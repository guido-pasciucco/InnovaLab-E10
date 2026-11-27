import { expect, test } from "../fixtures";

// The launcher only mounts when the root layout resolves a complete Bedrock
// config. Playwright builds and starts the app with the env from `.env.test`
// (production `next start`), where no application inference-profile ARN or
// AWS credentials exist; `HELP_ENABLED=true` alone cannot turn the widget on,
// and `HELP_PREVIEW` needs NODE_ENV=development. Each test therefore skips
// itself when the launcher is absent instead of failing on an unconfigured
// stack. With a fully configured env, both flows run against the real UI.
const HELP_DISABLED = "help assistant is disabled without a Bedrock inference profile";

test("a signed-in user opens Mora and the greeting bubble disappears", async ({
  authedPage,
}) => {
  // Arrange
  await authedPage.goto("/inicio");
  const launcher = authedPage.getByRole("button", { name: "Abrir ayuda de Mora" });
  test.skip((await launcher.count()) === 0, HELP_DISABLED);

  const greeting = authedPage.getByRole("status").filter({ hasText: "¡Hola! Soy Mora 👋" });
  await launcher.hover();
  await expect(greeting).toBeVisible();

  // Act
  await launcher.click();

  // Assert
  const panel = authedPage.getByRole("region", { name: /^Mora, asistente de Numora/ });
  await expect(panel.getByRole("button", { name: "Cerrar Mora" })).toBeVisible();
  await expect(greeting).toHaveCount(0);
});

test("a signed-in user closes Mora and gets focus back on the launcher", async ({
  authedPage,
}) => {
  // Arrange
  await authedPage.goto("/inicio");
  const launcher = authedPage.getByRole("button", { name: "Abrir ayuda de Mora" });
  test.skip((await launcher.count()) === 0, HELP_DISABLED);
  await launcher.click();

  const panel = authedPage.getByRole("region", { name: /^Mora, asistente de Numora/ });
  const closeButton = panel.getByRole("button", { name: "Cerrar Mora" });
  await expect(closeButton).toBeVisible();

  // Act
  await closeButton.click();

  // Assert
  await expect(launcher).toBeFocused();
  await expect(launcher).toHaveAttribute("aria-label", "Abrir ayuda de Mora");
});
