import { test, expect } from "../fixtures";

test("a session owner recovers the saved setup after reloading", async ({ authedPage }) => {
  await authedPage.goto("/paso-1");
  await authedPage.getByLabel("Nombre del producto", { exact: true }).fill("Producto de sesión");
  await authedPage.getByLabel("Unidad", { exact: true }).fill("caja");
  await authedPage.getByLabel("Volumen", { exact: true }).fill("37");

  const response = authedPage.waitForResponse(
    (res) => res.request().method() === "POST" && new URL(res.url()).pathname === "/paso-1",
  );
  await authedPage.getByRole("button", { name: "Guardar", exact: true }).click();
  await response;
  await expect(authedPage.getByRole("button", { name: "Guardar", exact: true })).toBeEnabled();
  await authedPage.reload();

  await expect(authedPage.getByLabel("Nombre del producto", { exact: true })).toHaveValue("Producto de sesión");
  await expect(authedPage.getByLabel("Unidad", { exact: true })).toHaveValue("caja");
  await expect(authedPage.getByLabel("Volumen", { exact: true })).toHaveValue("37");
});

test("a visitor without a session cannot open calculator setup", async ({ page }) => {
  await page.goto("/paso-1");

  await expect(page).toHaveURL("/login");
});
