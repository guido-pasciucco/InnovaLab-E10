import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import {
  createPresentationService,
  deletePresentationService,
  getProductPresentationsService,
  listPresentationNamesByProductService,
  updatePresentationService,
} from "./presentations";
import { createProductService } from "./products";
import { createSupplyService, deleteSupplyService, updateSupplyService } from "./supplies";

// Integration tests for the presentations service (P12, #298) against the local
// Supabase stack. Each test creates its own user and removes it in afterEach,
// cascading products, presentations and supplies.

const flour = {
  kind: "supply",
  name: "Harina 000",
  purchasePrice: "18750.00",
  purchaseQuantity: "25",
  purchaseUnit: "kg",
} as const;

// 5000 / 50 = 100 per box.
const box = {
  kind: "packaging",
  name: "Caja",
  purchasePrice: "5000.00",
  purchaseQuantity: "50",
  purchaseUnit: "unidad",
} as const;

// 600 per dozen = 50 per label.
const label = {
  kind: "packaging",
  name: "Etiqueta",
  purchasePrice: "600.00",
  purchaseQuantity: "1",
  purchaseUnit: "docena",
} as const;

const MISSING_ID = "00000000-0000-0000-0000-000000000000";

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
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((f) => f.reason),
      `cleanup failed for ${failures.length} user(s)`,
    );
  }
});

async function makeUser(): Promise<CreatedUser> {
  const user = await createUser();
  users.push(user);
  return user;
}

// Product: 250 g of flour (0.75 per g) yields 12 units → 187.50 per recipe,
// 15.625 per unit.
async function arrange(user: CreatedUser) {
  const supply = await createSupplyService(user.id, flour, db);
  const boxRow = await createSupplyService(user.id, box, db);
  const labelRow = await createSupplyService(user.id, label, db);
  const product = await createProductService(
    user.id,
    {
      name: "Alfajor",
      yieldQuantity: "12",
      recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
    },
    db,
  );
  return { supply, box: boxRow, label: labelRow, product };
}

function boxOfSix(boxId: string, labelId: string) {
  return {
    name: "Caja x6",
    unitsPerPresentation: "6",
    packaging: [
      { supplyId: boxId, quantity: "1", unit: "unidad" },
      { supplyId: labelId, quantity: "0.5", unit: "docena" },
    ],
  };
}

describe("presentations service", () => {
  it("creates a presentation with its packaging", async () => {
    const user = await makeUser();
    const { box: boxRow, label: labelRow, product } = await arrange(user);

    const presentation = await createPresentationService(
      user.id,
      product.id,
      boxOfSix(boxRow.id, labelRow.id),
      db,
    );

    expect(presentation).toEqual({
      id: expect.any(String),
      name: "Caja x6",
      unitsPerPresentation: "6",
      packaging: [
        { supplyId: boxRow.id, supplyName: "Caja", quantity: "1", unit: "unidad" },
        { supplyId: labelRow.id, supplyName: "Etiqueta", quantity: "0.5", unit: "docena" },
      ],
    });
  });

  it("returns the unit cost and each presentation cost with its packaging", async () => {
    const user = await makeUser();
    const { box: boxRow, label: labelRow, product } = await arrange(user);
    await createPresentationService(user.id, product.id, boxOfSix(boxRow.id, labelRow.id), db);
    await createPresentationService(
      user.id,
      product.id,
      { name: "Unidad", unitsPerPresentation: "1", packaging: [] },
      db,
    );

    const view = await getProductPresentationsService(user.id, product.id, db);

    expect(view?.presentations.map((p) => p.name)).toEqual(["Caja x6", "Unidad"]);
    expect(view?.product.variableCosts?.unitCost).toBe("15.63");
    // 187.50 × 6 ÷ 12 = 93.75 product + 100 box + 6 labels × 50 = 493.75.
    expect(view?.product.variableCosts?.presentations).toMatchObject([
      { name: "Caja x6", productCost: "93.75", packagingCost: "400.00", totalCost: "493.75" },
      { name: "Unidad", productCost: "15.63", packagingCost: "0.00", totalCost: "15.63" },
    ]);
    expect(view?.packagingWithoutPrice).toEqual([]);
  });

  it("flags packaging that still has no price", async () => {
    const user = await makeUser();
    const { box: boxRow, product } = await arrange(user);
    const free = await createSupplyService(
      user.id,
      { ...box, name: "Cinta", purchasePrice: "0" },
      db,
    );
    await createPresentationService(
      user.id,
      product.id,
      {
        name: "Caja x6",
        unitsPerPresentation: "6",
        packaging: [
          { supplyId: boxRow.id, quantity: "1", unit: "unidad" },
          { supplyId: free.id, quantity: "1", unit: "unidad" },
        ],
      },
      db,
    );

    const view = await getProductPresentationsService(user.id, product.id, db);

    expect(view?.packagingWithoutPrice).toEqual([free.id]);
  });

  it("rejects a second presentation with the same name in the product", async () => {
    const user = await makeUser();
    const { product } = await arrange(user);
    const input = { name: "Caja x6", unitsPerPresentation: "6", packaging: [] };
    await createPresentationService(user.id, product.id, input, db);

    await expect(
      createPresentationService(user.id, product.id, { ...input, name: " Caja x6 " }, db),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      details: {
        fieldErrors: { name: ["Ya hay una presentación con ese nombre en este producto."] },
      },
    });
  });

  it.each(["0", "2.5", "-3", "abc"])("rejects %s units per presentation", async (units) => {
    const user = await makeUser();
    const { product } = await arrange(user);

    await expect(
      createPresentationService(
        user.id,
        product.id,
        { name: "Caja", unitsPerPresentation: units, packaging: [] },
        db,
      ),
    ).rejects.toMatchObject({ name: "ZodError" });
  });

  it("rejects a supply used as packaging", async () => {
    const user = await makeUser();
    const { supply, product } = await arrange(user);

    await expect(
      createPresentationService(
        user.id,
        product.id,
        {
          name: "Caja",
          unitsPerPresentation: "6",
          packaging: [{ supplyId: supply.id, quantity: "1", unit: "g" }],
        },
        db,
      ),
    ).rejects.toMatchObject({ code: "SUPPLY_NOT_PACKAGING" });
  });

  it("rejects a packaging unit from another family", async () => {
    const user = await makeUser();
    const { box: boxRow, product } = await arrange(user);

    await expect(
      createPresentationService(
        user.id,
        product.id,
        {
          name: "Caja",
          unitsPerPresentation: "6",
          packaging: [{ supplyId: boxRow.id, quantity: "1", unit: "kg" }],
        },
        db,
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      details: {
        fieldErrors: {
          packaging: ["Elegí una unidad de medida de la misma familia que el packaging."],
        },
      },
    });
  });

  it("rejects the same packaging twice in a presentation", async () => {
    const user = await makeUser();
    const { box: boxRow, product } = await arrange(user);

    await expect(
      createPresentationService(
        user.id,
        product.id,
        {
          name: "Caja",
          unitsPerPresentation: "6",
          packaging: [
            { supplyId: boxRow.id, quantity: "1", unit: "unidad" },
            { supplyId: boxRow.id, quantity: "2", unit: "unidad" },
          ],
        },
        db,
      ),
    ).rejects.toMatchObject({ name: "ZodError" });
  });

  it("replaces the packaging lines on update", async () => {
    const user = await makeUser();
    const { box: boxRow, label: labelRow, product } = await arrange(user);
    const created = await createPresentationService(
      user.id,
      product.id,
      boxOfSix(boxRow.id, labelRow.id),
      db,
    );

    const updated = await updatePresentationService(
      user.id,
      created!.id,
      {
        name: "Caja x12",
        unitsPerPresentation: "12",
        packaging: [{ supplyId: boxRow.id, quantity: "2", unit: "unidad" }],
      },
      db,
    );

    expect(updated).toEqual({
      id: created!.id,
      name: "Caja x12",
      unitsPerPresentation: "12",
      packaging: [{ supplyId: boxRow.id, supplyName: "Caja", quantity: "2", unit: "unidad" }],
    });
  });

  it("deletes a presentation", async () => {
    const user = await makeUser();
    const { product } = await arrange(user);
    const created = await createPresentationService(
      user.id,
      product.id,
      { name: "Unidad", unitsPerPresentation: "1", packaging: [] },
      db,
    );

    await expect(deletePresentationService(user.id, created!.id, db)).resolves.toBe(true);

    const view = await getProductPresentationsService(user.id, product.id, db);
    expect(view?.presentations).toEqual([]);
  });

  it("lists presentation names by product", async () => {
    const user = await makeUser();
    const { product } = await arrange(user);
    await createPresentationService(
      user.id,
      product.id,
      { name: "Unidad", unitsPerPresentation: "1", packaging: [] },
      db,
    );
    await createPresentationService(
      user.id,
      product.id,
      { name: "Caja x6", unitsPerPresentation: "6", packaging: [] },
      db,
    );

    await expect(listPresentationNamesByProductService(user.id, db)).resolves.toEqual({
      [product.id]: ["Unidad", "Caja x6"],
    });
  });

  it("isolates presentations by owner", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const { box: boxRow, product } = await arrange(owner);
    const created = await createPresentationService(
      owner.id,
      product.id,
      { name: "Unidad", unitsPerPresentation: "1", packaging: [] },
      db,
    );
    const input = { name: "Robada", unitsPerPresentation: "1", packaging: [] };

    await expect(getProductPresentationsService(other.id, product.id, db)).resolves.toBeNull();
    await expect(createPresentationService(other.id, product.id, input, db)).resolves.toBeNull();
    await expect(
      updatePresentationService(other.id, created!.id, input, db),
    ).resolves.toBeNull();
    await expect(deletePresentationService(other.id, created!.id, db)).resolves.toBe(false);
    await expect(listPresentationNamesByProductService(other.id, db)).resolves.toEqual({});

    // The owner cannot attach another user's packaging either.
    const { product: otherProduct } = await arrange(other);
    await expect(
      createPresentationService(
        other.id,
        otherProduct.id,
        {
          ...input,
          packaging: [{ supplyId: boxRow.id, quantity: "1", unit: "unidad" }],
        },
        db,
      ),
    ).rejects.toMatchObject({ code: "SUPPLY_NOT_FOUND" });
  });

  it("returns null for a missing product or presentation", async () => {
    const user = await makeUser();
    const input = { name: "Unidad", unitsPerPresentation: "1", packaging: [] };

    await expect(getProductPresentationsService(user.id, MISSING_ID, db)).resolves.toBeNull();
    await expect(createPresentationService(user.id, MISSING_ID, input, db)).resolves.toBeNull();
    await expect(updatePresentationService(user.id, MISSING_ID, input, db)).resolves.toBeNull();
    await expect(deletePresentationService(user.id, MISSING_ID, db)).resolves.toBe(false);
  });

  it("treats a malformed id like a missing one", async () => {
    const user = await makeUser();
    const input = { name: "Unidad", unitsPerPresentation: "1", packaging: [] };

    await expect(getProductPresentationsService(user.id, "abc", db)).resolves.toBeNull();
    await expect(createPresentationService(user.id, "abc", input, db)).resolves.toBeNull();
    await expect(updatePresentationService(user.id, "abc", input, db)).resolves.toBeNull();
    await expect(deletePresentationService(user.id, "abc", db)).resolves.toBe(false);
  });
});

describe("packaging used by a presentation", () => {
  async function arrangeInUse(user: CreatedUser) {
    const arranged = await arrange(user);
    await createPresentationService(
      user.id,
      arranged.product.id,
      boxOfSix(arranged.box.id, arranged.label.id),
      db,
    );
    return arranged;
  }

  it("blocks deleting it", async () => {
    const user = await makeUser();
    const { box: boxRow } = await arrangeInUse(user);

    await expect(deleteSupplyService(user.id, boxRow.id, db)).rejects.toMatchObject({
      code: "SUPPLY_IN_USE",
    });
  });

  it("blocks changing its unit family", async () => {
    const user = await makeUser();
    const { box: boxRow } = await arrangeInUse(user);

    await expect(
      updateSupplyService(user.id, boxRow.id, { ...box, purchaseUnit: "kg" }, db),
    ).rejects.toMatchObject({ code: "SUPPLY_IN_USE" });
  });

  it("blocks turning it into a supply", async () => {
    const user = await makeUser();
    const { box: boxRow } = await arrangeInUse(user);

    await expect(
      updateSupplyService(user.id, boxRow.id, { ...box, kind: "supply" }, db),
    ).rejects.toMatchObject({ code: "SUPPLY_IN_USE" });
  });

  it("allows a price change and the presentation cost follows it", async () => {
    const user = await makeUser();
    const { box: boxRow, product } = await arrangeInUse(user);

    await updateSupplyService(user.id, boxRow.id, { ...box, purchasePrice: "10000.00" }, db);

    const view = await getProductPresentationsService(user.id, product.id, db);
    // Box now costs 200: 93.75 + 200 + 300 = 593.75.
    expect(view?.product.variableCosts?.presentations[0]?.totalCost).toBe("593.75");
  });
});
