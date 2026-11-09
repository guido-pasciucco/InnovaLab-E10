import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getDrizzleClient, type Db } from "@/lib/db/client";
import { supplies } from "@/lib/db/supplies/table";

import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import {
  createSupplyService,
  deleteSupplyService,
  listSuppliesService,
  updateSupplyService,
} from "./supplies";

// Integration tests against the local Supabase stack (.env.test URLs are
// local-only; loadTestEnv throws otherwise). One db client (one postgres-js
// pool) per file, closed in afterAll; users are removed (profile + auth user)
// after each test, cascading their supplies rows.

const validInput = {
  name: "Harina 000",
  purchasePrice: "18750.00",
} as const;

let db: Db;
const users: CreatedUser[] = [];

beforeAll(() => {
  process.env.DATABASE_URL = loadTestEnv().DATABASE_URL;
  // Drop any singleton built from another DATABASE_URL so this file's
  // client points at the local stack.
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

// Attempts every deletion even if one fails, then reports all failures.
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

async function countSupplies(userId: string): Promise<number> {
  const rows = await db.select({ id: supplies.id }).from(supplies).where(eq(supplies.userId, userId));
  return rows.length;
}

describe("supplies service", () => {
  it("lists empty when the user has no supplies", async () => {
    const user = await makeUser();

    const rows = await listSuppliesService(user.id, db);
    expect(rows).toHaveLength(0);
  });

  it("creates a supply and returns it", async () => {
    const user = await makeUser();

    const supply = await createSupplyService(user.id, validInput, db);

    expect(supply.name).toBe(validInput.name);
    expect(supply.purchasePrice).toBe(validInput.purchasePrice);
    expect(supply.userId).toBe(user.id);
    expect(supply.id).toBeDefined();
  });

  it("lists created supplies", async () => {
    const user = await makeUser();
    await createSupplyService(user.id, validInput, db);

    const rows = await listSuppliesService(user.id, db);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe(validInput.name);
  });

  it("updates a supply", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);

    const updated = await updateSupplyService(user.id, supply.id, {
      name: "Harina integral",
      purchasePrice: "22000.00",
    }, db);

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Harina integral");
    expect(updated!.purchasePrice).toBe("22000.00");
  });

  it("deletes a supply", async () => {
    const user = await makeUser();
    const supply = await createSupplyService(user.id, validInput, db);

    const deleted = await deleteSupplyService(user.id, supply.id, db);
    expect(deleted).toBe(true);

    const rows = await listSuppliesService(user.id, db);
    expect(rows).toHaveLength(0);
  });

  it("delete returns null when supply does not exist", async () => {
    const user = await makeUser();

    const deleted = await deleteSupplyService(user.id, "00000000-0000-0000-0000-000000000000", db);
    expect(deleted).toBe(false);
  });

  it("users do not see each other's supplies", async () => {
    const userA = await makeUser();
    const userB = await makeUser();

    await createSupplyService(userA.id, validInput, db);

    const rowsA = await listSuppliesService(userA.id, db);
    const rowsB = await listSuppliesService(userB.id, db);

    expect(rowsA).toHaveLength(1);
    expect(rowsB).toHaveLength(0);
  });

  it("update of another user's supply returns null", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const supply = await createSupplyService(userA.id, validInput, db);

    const updated = await updateSupplyService(userB.id, supply.id, {
      name: "Hackeado",
      purchasePrice: "999999.00",
    }, db);

    expect(updated).toBeNull();

    const rows = await listSuppliesService(userA.id, db);
    expect(rows[0].name).toBe(validInput.name);
  });

  it("delete of another user's supply returns false", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const supply = await createSupplyService(userA.id, validInput, db);

    const deleted = await deleteSupplyService(userB.id, supply.id, db);
    expect(deleted).toBe(false);

    const rows = await listSuppliesService(userA.id, db);
    expect(rows).toHaveLength(1);
  });
});
