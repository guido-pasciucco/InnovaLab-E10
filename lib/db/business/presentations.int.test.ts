import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { supplies } from "@/lib/db/supplies/table";
import { createProductService } from "@/lib/services/products";
import { createSupplyService } from "@/lib/services/supplies";
import { createUser, deleteUser, type CreatedUser } from "../../../tests/support/factories/user";
import { loadTestEnv } from "../../../tests/support/test-env";
import { presentationPackaging, presentations } from "./table";

// Integration tests for the presentation tables against the local Supabase
// stack. No presentation service exists yet, so rows are inserted directly.
// Users are removed after each test (profile + auth user), cascading their rows.

const packagingInput = {
  kind: "packaging",
  name: "Caja x6",
  purchasePrice: "5000.00",
  purchaseQuantity: "50",
  purchaseUnit: "unidad",
  minimumUnit: "unidad",
  conversionFactor: "1",
} as const;

const supplyInput = {
  kind: "supply",
  name: "Harina 000",
  purchasePrice: "18750.00",
  purchaseQuantity: "25",
  purchaseUnit: "kg",
  minimumUnit: "g",
  conversionFactor: "1000",
} as const;

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

// A product with one presentation that uses one packaging item.
async function arrangePresentationWithPackaging(user: CreatedUser) {
  const supply = await createSupplyService(user.id, supplyInput, db);
  const packaging = await createSupplyService(user.id, packagingInput, db);
  const product = await createProductService(
    user.id,
    {
      name: "Alfajor",
      yieldQuantity: "12",
      recipe: [{ supplyId: supply.id, quantity: "250", unit: "g" }],
    },
    db,
  );
  const [presentation] = await db
    .insert(presentations)
    .values({ productId: product.id, name: "Caja x6", unitsPerPresentation: "6" })
    .returning();
  if (!presentation) throw new Error("arrange: no presentation returned");
  await db.insert(presentationPackaging).values({
    presentationId: presentation.id,
    supplyId: packaging.id,
    unit: "unidad",
    quantity: "1",
  });
  return { packaging, presentation };
}

describe("presentation_packaging foreign key to supplies", () => {
  it("lets an account deletion cascade remove packaging used by a presentation", async () => {
    const user = await createUser();
    const { packaging, presentation } = await arrangePresentationWithPackaging(user);

    await expect(deleteUser(user.id)).resolves.not.toThrow();

    await expect(
      db.select().from(supplies).where(eq(supplies.id, packaging.id)),
    ).resolves.toHaveLength(0);
    await expect(
      db
        .select()
        .from(presentationPackaging)
        .where(eq(presentationPackaging.presentationId, presentation.id)),
    ).resolves.toHaveLength(0);
  });

  it("still rejects deleting packaging directly while a presentation uses it", async () => {
    const user = await makeUser();
    const { packaging } = await arrangePresentationWithPackaging(user);

    await expect(
      db.delete(supplies).where(eq(supplies.id, packaging.id)),
    ).rejects.toMatchObject({ cause: { code: "23503" } });

    await expect(
      db.select().from(supplies).where(eq(supplies.id, packaging.id)),
    ).resolves.toHaveLength(1);
  });
});
