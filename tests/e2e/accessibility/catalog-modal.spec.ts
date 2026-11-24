import { expect, test } from "../fixtures";

test("CatalogModal atrapa el foco y lo restituye al cerrar", async ({
  authedPage,
}) => {
  await authedPage.goto("/supplies");
  const trigger = authedPage.getByRole("button", { name: "+ Nuevo" });
  await trigger.click();

  const dialog = authedPage.getByRole("dialog", { name: "Nuevo insumo" });
  await expect(dialog).toBeVisible();

  // Foco inicial en el primer campo del contenido.
  await expect(authedPage.getByLabel("Nombre del insumo")).toBeFocused();

  const focusables = dialog.locator(
    'a[href], button:not([disabled]), textarea, input:not([type="hidden"]), select, [tabindex]:not([tabindex="-1"])',
  );
  const count = await focusables.count();
  expect(count).toBeGreaterThan(1);

  // Tab no escapa del diálogo: tras recorrer todos los controles el foco
  // sigue dentro del modal.
  for (let i = 0; i < count + 1; i++) {
    await authedPage.keyboard.press("Tab");
  }
  await expect(dialog.locator(":focus")).toBeVisible();

  // Escape cierra y restituye el foco al disparador.
  await authedPage.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("el modal de Gastos del período cierra con Escape y con el backdrop", async ({
  authedPage,
}) => {
  await authedPage.goto("/period-costs");
  const trigger = authedPage.getByRole("button", { name: "+ Nuevo" });
  await trigger.click();

  const dialog = authedPage.getByRole("dialog", {
    name: "Nuevo gasto del período",
  });
  await expect(dialog).toBeVisible();
  await expect(authedPage.getByLabel("Concepto", { exact: true })).toBeFocused();

  await authedPage.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await authedPage.mouse.click(5, 5);
  await expect(dialog).toHaveCount(0);
});
