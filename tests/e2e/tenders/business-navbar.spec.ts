import { expect, test } from "../fixtures";

// Flow 1 navbar: the section menu switches between the catalog and tenders,
// the sidebar follows the section, and the flow switcher lives in the navbar.
test("el navbar cambia a licitaciones y el sidebar muestra sus páginas", async ({ authedPage }) => {
  await authedPage.goto("/supplies");
  const sections = authedPage.getByRole("navigation", { name: "Secciones" });
  const sidebar = authedPage.getByRole("navigation", { name: "Principal" });

  await sections.getByRole("link", { name: "Licitaciones" }).click();

  await expect(authedPage).toHaveURL("/licitaciones");
  await expect(authedPage.getByRole("heading", { name: "Licitaciones", level: 1 })).toBeVisible();
  await expect(sections.getByRole("link", { name: "Licitaciones" })).toHaveAttribute("aria-current", "page");
  await expect(sidebar.getByRole("link", { name: "Insumos" })).toHaveCount(0);

  await sidebar.getByRole("link", { name: "Proveedores" }).click();
  await expect(authedPage).toHaveURL("/proveedores");

  await sections.getByRole("link", { name: "Catálogo" }).click();
  await expect(authedPage).toHaveURL("/supplies");
  await expect(sidebar.getByRole("link", { name: "Productos" })).toBeVisible();
});
