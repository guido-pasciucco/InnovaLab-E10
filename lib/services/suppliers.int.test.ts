import { fakerES as faker } from "@faker-js/faker";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { businesses } from "@/lib/db/business/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { suppliers } from "@/lib/db/suppliers/table";
import { AppError } from "@/lib/errors/app-error";

import { buildSupplierProfile, randomValidCuit } from "../../tests/support/factories/supplier";
import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import {
  completeSupplierSignupService,
  getSupplierService,
  isSupplierOnlyService,
  listPublicSuppliersService,
  registerSupplierService,
  startSupplierSignupService,
} from "./suppliers";
import { createSupplyService } from "./supplies";

// Integration tests for the public supplier registry (issue #309, RN-22 and
// RN-23) against the local Supabase stack. Users are removed after each test;
// their supplier rows cascade.

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
    throw new AggregateError(failures.map((f) => f.reason), "cleanup failed");
  }
});

async function makeUser(): Promise<CreatedUser> {
  const user = await createUser();
  users.push(user);
  return user;
}

async function expectAppError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (err: unknown) => err,
  );
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).code).toBe(code);
}

async function registeredSupplier(businessName = "Molino San José") {
  const supplier = await makeUser();
  const profile = buildSupplierProfile({ businessName });
  await registerSupplierService(supplier.id, supplier.email, profile, db);
  return { supplier, profile };
}

describe("registerSupplierService (public registration, #309)", () => {
  it("creates the supplier from the same form data, with no invitation or owner link", async () => {
    const { supplier, profile } = await registeredSupplier();

    const row = await getSupplierService(supplier.id, db);
    expect(row).toMatchObject({
      userId: supplier.id,
      businessName: "Molino San José",
      cuit: profile.cuit,
      contactName: "Ana Pérez",
      email: supplier.email,
      categories: ["Harinas", "Azúcares"],
    });
    expect(row?.termsAcceptedAt).toBeInstanceOf(Date);
  });

  it("refuses a second registration for the same account", async () => {
    const { supplier } = await registeredSupplier();

    await expectAppError(
      registerSupplierService(supplier.id, supplier.email, buildSupplierProfile(), db),
      "SUPPLIER_ALREADY_REGISTERED",
    );
  });

  it("never creates a second account for a CUIT (RN-23)", async () => {
    const { profile } = await registeredSupplier();
    const other = await makeUser();

    await expectAppError(
      registerSupplierService(other.id, other.email, buildSupplierProfile({ cuit: profile.cuit }), db),
      "SUPPLIER_CUIT_TAKEN",
    );
    const rows = await db.select().from(suppliers);
    expect(rows.filter((row) => row.cuit === profile.cuit)).toHaveLength(1);
  });

  it("rejects an invalid CUIT before touching the database", async () => {
    const supplier = await makeUser();

    await expect(
      registerSupplierService(supplier.id, supplier.email, buildSupplierProfile({ cuit: "20-12345678-7" }), db),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("requires a verified email", async () => {
    const supplier = await makeUser();
    await expectAppError(
      registerSupplierService(supplier.id, undefined, buildSupplierProfile(), db),
      "UNAUTHORIZED",
    );
  });
});

describe("listPublicSuppliersService", () => {
  it("lists every registered supplier, with rubros, for the public registry", async () => {
    const first = await registeredSupplier("Molino");
    const second = await registeredSupplier("Lácteos del Sur");

    const rows = await listPublicSuppliersService(db);
    const ids = rows.map((row) => row.userId);
    expect(ids).toContain(first.supplier.id);
    expect(ids).toContain(second.supplier.id);
    const molino = rows.find((row) => row.userId === first.supplier.id);
    expect(molino).toMatchObject({ businessName: "Molino", categories: ["Harinas", "Azúcares"] });
  });
});

describe("startSupplierSignupService", () => {
  function fakeClient() {
    const signUp = vi.fn().mockResolvedValue({ data: {}, error: null });
    return { client: { auth: { signUp } } as unknown as SupabaseClient, signUp };
  }

  it("asks Supabase to create the account and keeps the supplier data until the email is confirmed", async () => {
    const { client, signUp } = fakeClient();
    const now = new Date("2026-11-21T12:00:00Z");
    const password = faker.internet.password({ length: 16 });
    const profile = buildSupplierProfile({ email: "molino@example.test", password });

    await startSupplierSignupService(client, profile, "http://site/auth/confirm", db, now);

    expect(signUp).toHaveBeenCalledWith({
      email: "molino@example.test",
      password,
      options: {
        data: {
          display_name: "Molino San José",
          pending_supplier: {
            businessName: "Molino San José",
            cuit: profile.cuit,
            contactName: "Ana Pérez",
            phone: "+54 11 5555-1234",
            categories: ["Harinas", "Azúcares"],
            termsAcceptedAt: "2026-11-21T12:00:00.000Z",
          },
        },
        emailRedirectTo: "http://site/auth/confirm",
      },
    });
  });

  it("stops before Supabase when the CUIT already has an account", async () => {
    const { profile } = await registeredSupplier();
    const { client, signUp } = fakeClient();
    const input = buildSupplierProfile({
      cuit: profile.cuit,
      email: "x@example.test",
      password: faker.internet.password({ length: 16 }),
    });

    await expectAppError(startSupplierSignupService(client, input, "http://site", db), "SUPPLIER_CUIT_TAKEN");
    expect(signUp).not.toHaveBeenCalled();
  });
});

describe("completeSupplierSignupService", () => {
  it("registers the supplier from the pending data once the email is confirmed", async () => {
    const supplier = await makeUser();
    const cuit = randomValidCuit();
    const pending = {
      businessName: "Molino San José",
      cuit,
      contactName: "Ana Pérez",
      phone: "1155551234",
      categories: ["Harinas"],
      termsAcceptedAt: "2026-11-20T10:00:00.000Z",
    };

    await completeSupplierSignupService(supplier.id, supplier.email, pending, db);

    const row = await getSupplierService(supplier.id, db);
    expect(row).toMatchObject({ userId: supplier.id, cuit, categories: ["Harinas"] });
    expect(row?.termsAcceptedAt.toISOString()).toBe("2026-11-20T10:00:00.000Z");
  });

  it("validates the pending data again (the owner can edit metadata)", async () => {
    const supplier = await makeUser();
    await expect(
      completeSupplierSignupService(supplier.id, supplier.email, { cuit: "1" }, db),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("refuses to complete when the CUIT was taken while the email was being confirmed", async () => {
    const { profile } = await registeredSupplier();
    const supplier = await makeUser();
    const pending = {
      businessName: "Otro Molino",
      cuit: profile.cuit,
      contactName: "Ana Pérez",
      phone: "1155551234",
      categories: ["Harinas"],
    };

    await expectAppError(
      completeSupplierSignupService(supplier.id, supplier.email, pending, db),
      "SUPPLIER_CUIT_TAKEN",
    );
  });
});

describe("isSupplierOnlyService", () => {
  it("is true for a supplier without a business or catalog of its own", async () => {
    const { supplier } = await registeredSupplier();
    const emprendedor = await makeUser();

    await expect(isSupplierOnlyService(supplier.id, db)).resolves.toBe(true);
    await expect(isSupplierOnlyService(emprendedor.id, db)).resolves.toBe(false);

    await db.insert(businesses).values({ ownerUserId: supplier.id, name: "También vendo" });
    await expect(isSupplierOnlyService(supplier.id, db)).resolves.toBe(false);
  });

  it("is false for an emprendedor with a catalog but no business yet", async () => {
    const emprendedor = await makeUser();
    await createSupplyService(
      emprendedor.id,
      { kind: "supply", name: "Harina", purchasePrice: "100", purchaseQuantity: "1", purchaseUnit: "kg" },
      db,
    );
    await registerSupplierService(emprendedor.id, emprendedor.email, buildSupplierProfile(), db);

    await expect(isSupplierOnlyService(emprendedor.id, db)).resolves.toBe(false);
  });
});
