import { expect, test } from "../fixtures";
import { Paso1Page } from "../pages/paso-1.page";

test("Empezar cálculo resumes at the furthest saved step", async ({ authedPage }) => {
  const setup = new Paso1Page(authedPage);
  await setup.goto();
  await setup.saveAndContinue({ name: "Pan de avena", unit: "docena", volume: 96 });

  await authedPage.goto("/");
  await authedPage.getByRole("main").getByRole("link", { name: "Calcular mis costos" }).click();

  await expect(authedPage).toHaveURL(/\/paso-2$/);
});

test("Empezar cálculo starts at step 1 when nothing is saved yet", async ({ authedPage }) => {
  await authedPage.goto("/");
  await authedPage.getByRole("main").getByRole("link", { name: "Calcular mis costos" }).click();

  await expect(authedPage).toHaveURL(/\/paso-1$/);
});
