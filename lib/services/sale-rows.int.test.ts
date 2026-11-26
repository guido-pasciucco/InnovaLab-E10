import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { getDrizzleClient, type Db } from "@/lib/db/client";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { addPeriodCostLineService } from "./business-cost";
import { getBreakEvenService } from "./break-even";
import { getCostDistributionService } from "./cost-distribution";
import { createPresentationService } from "./presentations";
import { getPricingService, saveDefaultMarkupPercentService } from "./pricing";
import { createProductService } from "./products";
import { listSaleRowsService } from "./sale-rows";
import { createSupplyService, updateSupplyService } from "./supplies";

// Issue #321: packaging enters total cost, price and break-even through the
// presentation, and a packaging price change shows up without saving again.

const flour = {
  kind: "supply" as const,
  name: "Harina",
  purchasePrice: "1000.00",
  purchaseQuantity: "1",
  purchaseUnit: "kg",
};

const box = {
  kind: "packaging" as const,
  name: "Caja",
  purchasePrice: "300.00",
  purchaseQuantity: "1",
  purchaseUnit: "unidad",
};

let db: Db;
const users: CreatedUser[] = [];

beforeAll(() => {
  process.env.DATABASE_URL = loadTestEnv().DATABASE_URL;
  globalThis.__drizzleClient = undefined;
  db = getDrizzleClient();
});

afterAll(async () => {
  try {
    if (db) await db.$client.end();
  } finally {
    globalThis.__drizzleClient = undefined;
  }
});

afterEach(async () => {
  const results = await Promise.allSettled(users.map((user) => deleteUser(user.id)));
  users.length = 0;
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failures.length > 0) {
    throw new AggregateError(failures.map((failure) => failure.reason), "cleanup failed");
  }
});

async function makeUser(): Promise<CreatedUser> {
  const user = await createUser();
  users.push(user);
  return user;
}

async function arrangeAlfajor(user: CreatedUser, boxPrice = "300.00") {
  const flourRow = await createSupplyService(user.id, flour, db);
  const boxRow = await createSupplyService(user.id, { ...box, purchasePrice: boxPrice }, db);
  const product = await createProductService(
    user.id,
    {
      name: "Alfajor",
      monthlyCapacity: 999,
      yieldQuantity: "10",
      recipe: [{ supplyId: flourRow.id, quantity: "1", unit: "kg" }],
    },
    db,
  );
  await createPresentationService(
    user.id,
    product.id,
    { name: "Unidad", unitsPerPresentation: "1", monthlyCapacity: 100, packaging: [] },
    db,
  );
  await createPresentationService(
    user.id,
    product.id,
    {
      name: "Caja x6",
      unitsPerPresentation: "6",
      monthlyCapacity: 50,
      packaging: [{ supplyId: boxRow.id, quantity: "1", unit: "unidad" }],
    },
    db,
  );
  await addPeriodCostLineService(user.id, { concept: "Gastos", amountPeriod: "30000" }, db);
  await saveDefaultMarkupPercentService(user.id, { defaultMarkupPercent: "50" }, db);
  return { flourRow, boxRow };
}

describe("sale rows for presentations", () => {
  it("reproduces the alfajor example in cost, price and break-even", async () => {
    const user = await makeUser();
    await arrangeAlfajor(user);

    const saleRows = await listSaleRowsService(user.id, db);
    expect(saleRows.map((row) => [row.name, row.variableUnit, row.capacity])).toEqual([
      ["Alfajor · Unidad", "100", 100],
      ["Alfajor · Caja x6", "900", 50],
    ]);

    const distribution = await getCostDistributionService(user.id, {}, db);
    expect(distribution.rows).toMatchObject([
      {
        name: "Alfajor · Unidad",
        variableUnit: "100.00",
        indirectUnit: "200.00",
        unitCost: "300.00",
      },
      {
        name: "Alfajor · Caja x6",
        variableUnit: "900.00",
        indirectUnit: "200.00",
        unitCost: "1100.00",
      },
    ]);

    const pricing = await getPricingService(user.id, {}, db);
    expect(pricing.rows).toMatchObject([
      { name: "Alfajor · Unidad", price: "450.00", profitUnit: "150.00", realMarginPct: "33.3333" },
      { name: "Alfajor · Caja x6", price: "1650.00", profitUnit: "550.00", realMarginPct: "33.3333" },
    ]);

    const breakEven = await getBreakEvenService(user.id, {
      getPricing: (id) => getPricingService(id, {}, db),
    });
    expect(breakEven.status).toBe("ready");
    expect(breakEven.totals).toMatchObject({
      breakEvenUnits: "62.0690",
      breakEvenSales: "52758.62",
    });
    expect(breakEven.rows).toMatchObject([
      { name: "Alfajor · Unidad", breakEvenUnits: "41.3793", breakEvenUnitsWhole: "42" },
      { name: "Alfajor · Caja x6", breakEvenUnits: "20.6897", breakEvenUnitsWhole: "21" },
    ]);
  });

  it("moves only the box when its packaging price changes, without saving the product", async () => {
    const user = await makeUser();
    const { boxRow } = await arrangeAlfajor(user);

    await updateSupplyService(
      user.id,
      boxRow.id,
      { ...box, purchasePrice: "600.00" },
      db,
    );

    const pricing = await getPricingService(user.id, {}, db);
    expect(pricing.rows).toMatchObject([
      { name: "Alfajor · Unidad", variableUnit: "100.00", unitCost: "300.00", price: "450.00" },
      { name: "Alfajor · Caja x6", variableUnit: "1200.00", unitCost: "1400.00", price: "2100.00" },
    ]);

    const breakEven = await getBreakEvenService(user.id, {
      getPricing: (id) => getPricingService(id, {}, db),
    });
    expect(breakEven.totals).toMatchObject({
      breakEvenUnits: "56.2500",
      breakEvenSales: "56250.00",
    });
    expect(breakEven.rows).toMatchObject([
      { name: "Alfajor · Unidad", breakEvenUnits: "37.5000", breakEvenUnitsWhole: "38" },
      { name: "Alfajor · Caja x6", breakEvenUnits: "18.7500", breakEvenUnitsWhole: "19" },
    ]);
  });

  it("keeps a product without presentations as a single row", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(
      user.id,
      { ...flour, name: "Mezcla", purchasePrice: "500.00" },
      db,
    );
    await createProductService(
      user.id,
      {
        name: "Budín",
        monthlyCapacity: 20,
        yieldQuantity: "1",
        recipe: [{ supplyId: supply.id, quantity: "1", unit: "kg" }],
      },
      db,
    );

    const distribution = await getCostDistributionService(user.id, {}, db);
    expect(distribution.rows).toMatchObject([
      {
        name: "Budín",
        presentationId: null,
        capacity: 20,
        variableUnit: "500.00",
      },
    ]);
  });
});
