import { randomValidCuit } from "../../support/factories/supplier";
import { createUser } from "../../support/factories/user";
import { expect, signInContext, test } from "../fixtures";
import { generateInviteLink } from "../helpers/supplier-invite";
import { moveTenderToRoundTwo, moveTenderToThePast } from "../helpers/tender-clock";

// docs/flujos/09-licitaciones.md end to end (ES-03 to ES-10): the emprendedor publishes,
// the supplier offers in its own session, the tender closes, and the
// emprendedor compares, chooses and issues the purchase order.
test("publicar, ofertar, cerrar, elegir y generar la orden de compra", async ({
  authedPage,
  browser,
  cleanup,
  baseURL,
}) => {
  test.slow();

  // Arrange: a catalog supply and a supplier linked through the invite link
  // (an existing account completing its supplier data, no email round trip).
  await authedPage.goto("/supplies");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  await authedPage.getByLabel("Nombre del insumo").fill("Harina 000");
  await authedPage.getByRole("textbox", { name: "Precio de compra" }).fill("18750");
  await authedPage.getByRole("combobox", { name: "Unidad de medida" }).selectOption("kg");
  await authedPage.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(authedPage.getByRole("cell", { name: "Harina 000", exact: true })).toBeVisible();

  const link = await generateInviteLink(authedPage, "Molino San José");
  const supplier = await createUser();
  cleanup.trackUserEmail(supplier.email);
  const supplierContext = await browser.newContext();
  await signInContext(supplierContext, supplier, baseURL!);
  const supplierPage = await supplierContext.newPage();
  await supplierPage.goto(link);
  await supplierPage.getByLabel("Nombre del negocio").fill("Molino San José");
  await supplierPage.getByLabel("CUIT").fill(randomValidCuit());
  await supplierPage.getByLabel("Persona de contacto").fill("Ana Pérez");
  await supplierPage.getByLabel("Teléfono").fill("+54 11 5555-1234");
  await supplierPage.getByLabel("Rubros").fill("Harinas");
  await supplierPage.getByRole("checkbox", { name: /Acepto los términos de uso/ }).check();
  await supplierPage.getByRole("button", { name: "Registrarme como proveedor" }).click();
  await expect(supplierPage).toHaveURL("/proveedor");

  // Act 1: publish (RN-01 to RN-07).
  await authedPage.goto("/licitaciones/nueva");
  await authedPage.getByLabel("Duración de licitación").fill("6");
  await authedPage.getByLabel("Cantidad de rondas").fill("2");
  await authedPage.getByLabel("% de baja por ronda").fill("10");
  await authedPage.getByRole("checkbox", { name: /Harina 000/ }).check();
  await authedPage.getByLabel("Cantidad (kg)").fill("10");
  await authedPage.getByLabel("Precio de partida por kg").fill("1000");
  await expect(authedPage.getByText("Precio objetivo por ronda: $ 1.000,00 → $ 900,00")).toBeVisible();
  await expect(authedPage.getByRole("checkbox", { name: /Molino San José/ })).toBeChecked();
  await authedPage.getByRole("button", { name: "Publicar licitación" }).click();

  await expect(authedPage).toHaveURL(/\/licitaciones\/[0-9a-f-]{36}$/);
  const tenderId = authedPage.url().split("/").pop()!;
  await expect(authedPage.getByRole("heading", { name: /^Licitación N° \d+$/ })).toBeVisible();

  // Act 2: the supplier offers (RN-08, RN-10). A price the server rejects
  // must show a message (#306); above the starting price is rejected under
  // the item, and a valid offer is recorded for round 1.
  await supplierPage.goto("/proveedor");
  await supplierPage.getByRole("link", { name: /^Licitación N° \d+$/ }).click();
  const price = supplierPage.getByLabel("Precio por kg");
  const submit = supplierPage.getByRole("button", { name: "Enviar ofertas de la ronda 1" });

  await price.fill("0");
  await submit.click();
  await expect(supplierPage.getByRole("alert").filter({ hasText: "El precio tiene que ser mayor a 0." })).toBeVisible();

  await price.fill("1.234");
  await submit.click();
  await expect(
    supplierPage.getByRole("alert").filter({ hasText: "El precio es un número con hasta 2 decimales." }),
  ).toBeVisible();

  await price.fill("1200");
  await submit.click();
  await expect(price).toHaveAttribute("aria-invalid", "true");

  await price.fill("950");
  await submit.click();
  await expect(supplierPage.getByText("Listo: registramos tu oferta de la ronda 1.")).toBeVisible();

  // Act 3: the clock reaches the close (RN-12).
  await moveTenderToThePast(tenderId);

  // Act 4: compare and choose (RN-13, RN-14), then the purchase order (RN-15).
  await authedPage.reload();
  const comparison = authedPage.getByRole("region", { name: "Cuadro comparativo" });
  await expect(comparison.getByRole("cell", { name: "Molino San José" })).toBeVisible();
  await expect(comparison.getByRole("cell", { name: "$ 950,00" })).toBeVisible();

  await authedPage.getByRole("button", { name: "Elegir", exact: true }).click();
  await expect(authedPage.getByText("Harina 000 · total $ 9.500,00")).toBeVisible();

  await authedPage.getByLabel("Condiciones de entrega").fill("En el local, el lunes de 8 a 12");
  await authedPage.getByLabel("Condiciones de pago").fill("Transferencia a 15 días");
  await authedPage.getByRole("button", { name: "Generar orden de compra" }).click();

  // Assert: the printable order with the agreed price and the terms.
  await expect(authedPage).toHaveURL(new RegExp(`/licitaciones/${tenderId}/ordenes/[0-9a-f-]{36}$`));
  await expect(authedPage.getByRole("heading", { name: /^Orden de compra N° \d+$/ })).toBeVisible();
  await expect(authedPage.getByText("Molino San José").first()).toBeVisible();
  await expect(authedPage.getByText("$ 9.500,00").first()).toBeVisible();
  await expect(authedPage.getByText("Transferencia a 15 días")).toBeVisible();

  await supplierContext.close();
});

// RN-18 / #306: the no-offer notice is informational. Its only action
// acknowledges it; cancelling stays in the general tender actions, where it
// still asks for confirmation.
test("aviso de insumos sin ofertas solo deja seguir, sin cancelar", async ({
  authedPage,
  browser,
  cleanup,
  baseURL,
}) => {
  test.slow();

  // Arrange: a supply, a registered supplier and a published tender nobody
  // offers for. Moving only round 1 into the past leaves the tender active in
  // round 2, which is when the warning is shown.
  await authedPage.goto("/supplies");
  await authedPage.getByRole("button", { name: "+ Nuevo" }).click();
  await authedPage.getByLabel("Nombre del insumo").fill("Harina 000");
  await authedPage.getByRole("textbox", { name: "Precio de compra" }).fill("18750");
  await authedPage.getByRole("combobox", { name: "Unidad de medida" }).selectOption("kg");
  await authedPage.getByRole("button", { name: "Guardar", exact: true }).click();

  const link = await generateInviteLink(authedPage, "Molino San José");
  const supplier = await createUser();
  cleanup.trackUserEmail(supplier.email);
  const supplierContext = await browser.newContext();
  await signInContext(supplierContext, supplier, baseURL!);
  const supplierPage = await supplierContext.newPage();
  await supplierPage.goto(link);
  await supplierPage.getByLabel("Nombre del negocio").fill("Molino San José");
  await supplierPage.getByLabel("CUIT").fill(randomValidCuit());
  await supplierPage.getByLabel("Persona de contacto").fill("Ana Pérez");
  await supplierPage.getByLabel("Teléfono").fill("+54 11 5555-1234");
  await supplierPage.getByLabel("Rubros").fill("Harinas");
  await supplierPage.getByRole("checkbox", { name: /Acepto los términos de uso/ }).check();
  await supplierPage.getByRole("button", { name: "Registrarme como proveedor" }).click();
  await expect(supplierPage).toHaveURL("/proveedor");

  await authedPage.goto("/licitaciones/nueva");
  await authedPage.getByLabel("Duración de licitación").fill("6");
  await authedPage.getByLabel("Cantidad de rondas").fill("2");
  await authedPage.getByLabel("% de baja por ronda").fill("10");
  await authedPage.getByRole("checkbox", { name: /Harina 000/ }).check();
  await authedPage.getByLabel("Cantidad (kg)").fill("10");
  await authedPage.getByLabel("Precio de partida por kg").fill("1000");
  await authedPage.getByRole("button", { name: "Publicar licitación" }).click();
  await expect(authedPage).toHaveURL(/\/licitaciones\/[0-9a-f-]{36}$/);
  const tenderId = authedPage.url().split("/").pop()!;
  await moveTenderToRoundTwo(tenderId);
  await authedPage.reload();

  const notice = authedPage.getByRole("alert").filter({ hasText: "Insumos sin ofertas en la primera ronda" });
  await expect(notice).toBeVisible();
  await expect(notice.getByText("Harina 000")).toBeVisible();
  await expect(notice.getByRole("button", { name: "Dejar que siga" })).toBeVisible();
  await expect(notice.getByRole("button", { name: /Cancelar/ })).toHaveCount(0);

  // The general action is still there and still asks for confirmation.
  const generalCancel = authedPage.getByRole("button", { name: "Cancelar licitación" });
  await expect(generalCancel).toBeVisible();
  await notice.getByRole("button", { name: "Dejar que siga" }).click();
  await expect(notice).toHaveCount(0);
  await expect(generalCancel).toBeVisible();

  await generalCancel.click();
  await expect(authedPage.getByRole("button", { name: "Sí, cancelar" })).toBeVisible();
  await expect(authedPage.getByRole("button", { name: "No" })).toBeVisible();
  await authedPage.getByRole("button", { name: "No" }).click();
  await expect(authedPage.getByRole("heading", { name: /^Licitación N° \d+$/ })).toBeVisible();

  await supplierContext.close();
});
