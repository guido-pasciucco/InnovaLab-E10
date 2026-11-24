import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { VerifiedUserId } from "./auth";

import { eq } from "drizzle-orm";

import { businesses } from "@/lib/db/business/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";

import {
  createUser,
  deleteUser,
  type CreatedUser,
} from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import { getOrCreateDefaultBusiness } from "./calculations";

// Integration tests against the local Supabase stack. deleteUser cascades the
// user's businesses.

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
  const failures = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected",
  );
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((f) => f.reason),
      `cleanup failed for ${failures.length} user(s)`,
    );
  }
});

async function makeUser(): Promise<VerifiedUserId> {
  const user = await createUser();
  users.push(user);
  return user.id;
}

function ownedBusinesses(userId: VerifiedUserId) {
  return db.select().from(businesses).where(eq(businesses.ownerUserId, userId));
}

describe("getOrCreateDefaultBusiness", () => {
  it("creates exactly one business when two calls race for a user without one", async () => {
    const userId = await makeUser();

    const [first, second] = await Promise.all([
      db.transaction((tx) => getOrCreateDefaultBusiness(tx, userId)),
      db.transaction((tx) => getOrCreateDefaultBusiness(tx, userId)),
    ]);

    const rows = await ownedBusinesses(userId);
    expect(rows).toHaveLength(1);
    expect(first.id).toBe(rows[0].id);
    expect(second.id).toBe(rows[0].id);
  });

  it("returns the oldest business when the owner already has several", async () => {
    const userId = await makeUser();
    // The newer row is inserted first so physical order cannot fake the result.
    await db.insert(businesses).values({
      name: "Newer",
      ownerUserId: userId,
      createdAt: new Date("2026-06-01T00:00:00Z"),
    });
    const [oldest] = await db
      .insert(businesses)
      .values({
        name: "Oldest",
        ownerUserId: userId,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      })
      .returning();

    for (let i = 0; i < 5; i++) {
      const result = await db.transaction((tx) => getOrCreateDefaultBusiness(tx, userId));
      expect(result.id).toBe(oldest.id);
    }
    expect(await ownedBusinesses(userId)).toHaveLength(2);
  });
});
