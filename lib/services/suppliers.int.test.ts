import { fakerES as faker } from "@faker-js/faker";
import type { SupabaseClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { businesses } from "@/lib/db/business/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { supplierInvites } from "@/lib/db/suppliers/table";
import { AppError } from "@/lib/errors/app-error";

import { buildSupplierProfile, randomValidCuit } from "../../tests/support/factories/supplier";
import { createUser, deleteUser, type CreatedUser } from "../../tests/support/factories/user";
import { loadTestEnv } from "../../tests/support/test-env";
import {
  acceptSupplierInviteService,
  completeSupplierSignupService,
  createSupplierInviteService,
  getHomePathService,
  getSupplierInviteService,
  hashInviteToken,
  listLinkedSuppliersService,
  listSupplierEmprendedoresService,
  listSupplierInvitesService,
  registerSupplierService,
  startSupplierSignupService,
} from "./suppliers";
import { createSupplyService } from "./supplies";

// Integration tests for the supplier registry (docs/flujos/09-licitaciones.md RN-22,
// RN-23) against the local Supabase stack. Users are removed after each test;
// their supplier rows, links and invites cascade.

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

// An emprendedor with a fresh invite, and a supplier registered through it.
async function registeredSupplier() {
  const owner = await makeUser();
  const supplier = await makeUser();
  const { token } = await createSupplierInviteService(owner.id, { label: "Molino" }, db);
  const profile = buildSupplierProfile();
  await registerSupplierService(supplier.id, supplier.email, token, profile, db);
  return { owner, supplier, profile };
}

describe("createSupplierInviteService", () => {
  it("returns a 7-day single-use token and stores only its hash", async () => {
    const owner = await makeUser();
    const now = new Date("2026-11-21T12:00:00Z");

    const invite = await createSupplierInviteService(owner.id, { label: " Molino " }, db, now);

    expect(invite.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(invite.label).toBe("Molino");
    expect(invite.expiresAt.toISOString()).toBe("2026-11-28T12:00:00.000Z");
    const [row] = await db
      .select()
      .from(supplierInvites)
      .where(eq(supplierInvites.ownerUserId, owner.id));
    expect(row?.tokenHash).toBe(hashInviteToken(invite.token));
    expect(row?.tokenHash).not.toContain(invite.token);
  });

  it("requires a label", async () => {
    const owner = await makeUser();
    await expect(createSupplierInviteService(owner.id, { label: "  " }, db)).rejects.toBeInstanceOf(
      ZodError,
    );
  });
});

describe("getSupplierInviteService", () => {
  it("finds a pending link with the emprendedor's name", async () => {
    const owner = await makeUser();
    const { token } = await createSupplierInviteService(owner.id, { label: "Molino" }, db);

    await expect(getSupplierInviteService(token, db)).resolves.toEqual({
      status: "valid",
      ownerUserId: owner.id,
      ownerName: owner.displayName,
      label: "Molino",
    });
  });

  it("treats an expired, malformed or unknown link as invalid", async () => {
    const owner = await makeUser();
    const now = new Date();
    const { token } = await createSupplierInviteService(owner.id, { label: "Molino" }, db, now);
    const eightDaysLater = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

    await expect(getSupplierInviteService(token, db, eightDaysLater)).resolves.toEqual({
      status: "invalid",
    });
    await expect(getSupplierInviteService("not-a-token", db)).resolves.toEqual({ status: "invalid" });
    await expect(getSupplierInviteService("A".repeat(43), db)).resolves.toEqual({ status: "invalid" });
  });
});

describe("registerSupplierService", () => {
  it("creates the supplier, links it to the emprendedor and spends the link", async () => {
    const { owner, supplier, profile } = await registeredSupplier();

    const linked = await listLinkedSuppliersService(owner.id, db);
    expect(linked).toHaveLength(1);
    expect(linked[0]).toMatchObject({
      userId: supplier.id,
      businessName: "Molino San José",
      cuit: profile.cuit,
      contactName: "Ana Pérez",
      email: supplier.email,
      categories: ["Harinas", "Azúcares"],
    });

    const invites = await listSupplierInvitesService(owner.id, db);
    expect(invites[0]).toMatchObject({ status: "used", supplierBusinessName: "Molino San José" });
  });

  it("refuses a link that was already used", async () => {
    const owner = await makeUser();
    const first = await makeUser();
    const second = await makeUser();
    const { token } = await createSupplierInviteService(owner.id, { label: "Molino" }, db);
    await registerSupplierService(first.id, first.email, token, buildSupplierProfile(), db);

    await expectAppError(
      registerSupplierService(second.id, second.email, token, buildSupplierProfile(), db),
      "SUPPLIER_INVITE_INVALID",
    );
  });

  it("refuses the emprendedor's own link", async () => {
    const owner = await makeUser();
    const { token } = await createSupplierInviteService(owner.id, { label: "Molino" }, db);

    await expectAppError(
      registerSupplierService(owner.id, owner.email, token, buildSupplierProfile(), db),
      "SUPPLIER_INVITE_OWN",
    );
  });

  it("never creates a second account for a CUIT (RN-23)", async () => {
    const { owner, profile } = await registeredSupplier();
    const other = await makeUser();
    const { token } = await createSupplierInviteService(owner.id, { label: "Otro" }, db);

    await expectAppError(
      registerSupplierService(other.id, other.email, token, buildSupplierProfile({ cuit: profile.cuit }), db),
      "SUPPLIER_CUIT_TAKEN",
    );
    // The link stays usable for the right supplier.
    await expect(getSupplierInviteService(token, db)).resolves.toMatchObject({ status: "valid" });
  });

  it("rejects an invalid CUIT before touching the database", async () => {
    const owner = await makeUser();
    const supplier = await makeUser();
    const { token } = await createSupplierInviteService(owner.id, { label: "Molino" }, db);

    await expect(
      registerSupplierService(supplier.id, supplier.email, token, buildSupplierProfile({ cuit: "20-12345678-7" }), db),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe("acceptSupplierInviteService (RN-22)", () => {
  it("links an existing supplier to a second emprendedor without a new account", async () => {
    const { owner, supplier } = await registeredSupplier();
    const secondOwner = await makeUser();
    const { token } = await createSupplierInviteService(secondOwner.id, { label: "Molino" }, db);

    await expect(acceptSupplierInviteService(supplier.id, token, db)).resolves.toEqual({
      ownerName: secondOwner.displayName,
    });

    const emprendedores = await listSupplierEmprendedoresService(supplier.id, db);
    expect(emprendedores.map((e) => e.ownerUserId).sort()).toEqual([owner.id, secondOwner.id].sort());
    // Each emprendedor sees the supplier, never the other emprendedor.
    expect((await listLinkedSuppliersService(owner.id, db)).map((s) => s.userId)).toEqual([supplier.id]);
    expect((await listLinkedSuppliersService(secondOwner.id, db)).map((s) => s.userId)).toEqual([
      supplier.id,
    ]);
  });

  it("asks a non-supplier account to register first", async () => {
    const owner = await makeUser();
    const someone = await makeUser();
    const { token } = await createSupplierInviteService(owner.id, { label: "Molino" }, db);

    await expectAppError(acceptSupplierInviteService(someone.id, token, db), "SUPPLIER_REQUIRED");
  });
});

describe("owner scoping", () => {
  it("never lists another emprendedor's suppliers or links", async () => {
    await registeredSupplier();
    const stranger = await makeUser();

    await expect(listLinkedSuppliersService(stranger.id, db)).resolves.toEqual([]);
    await expect(listSupplierInvitesService(stranger.id, db)).resolves.toEqual([]);
  });
});

describe("startSupplierSignupService", () => {
  function fakeClient() {
    const signUp = vi.fn().mockResolvedValue({ data: {}, error: null });
    return { client: { auth: { signUp } } as unknown as SupabaseClient, signUp };
  }

  it("asks Supabase to create the account and keeps the supplier data until the email is confirmed", async () => {
    const owner = await makeUser();
    const { token } = await createSupplierInviteService(owner.id, { label: "Molino" }, db);
    const { client, signUp } = fakeClient();
    const now = new Date("2026-11-21T12:00:00Z");
    const password = faker.internet.password({ length: 16 });
    const profile = buildSupplierProfile({ email: "molino@example.test", password });

    await startSupplierSignupService(client, token, profile, "http://site/auth/confirm", db, now);

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
            inviteTokenHash: hashInviteToken(token),
          },
        },
        emailRedirectTo: "http://site/auth/confirm",
      },
    });
  });

  it("stops before Supabase when the CUIT already has an account or the link is invalid", async () => {
    const { owner, profile } = await registeredSupplier();
    const { token } = await createSupplierInviteService(owner.id, { label: "Otro" }, db);
    const { client, signUp } = fakeClient();
    const input = buildSupplierProfile({
      cuit: profile.cuit,
      email: "x@example.test",
      password: faker.internet.password({ length: 16 }),
    });

    await expectAppError(
      startSupplierSignupService(client, token, input, "http://site", db),
      "SUPPLIER_CUIT_TAKEN",
    );
    await expectAppError(
      startSupplierSignupService(client, "A".repeat(43), { ...input, cuit: randomValidCuit() }, "http://site", db),
      "SUPPLIER_INVITE_INVALID",
    );
    expect(signUp).not.toHaveBeenCalled();
  });
});

describe("completeSupplierSignupService", () => {
  it("registers the supplier from the pending data once the email is confirmed", async () => {
    const owner = await makeUser();
    const supplier = await makeUser();
    const { token } = await createSupplierInviteService(owner.id, { label: "Molino" }, db);
    const cuit = randomValidCuit();
    const pending = {
      businessName: "Molino San José",
      cuit,
      contactName: "Ana Pérez",
      phone: "1155551234",
      categories: ["Harinas"],
      termsAcceptedAt: "2026-11-20T10:00:00.000Z",
      inviteTokenHash: hashInviteToken(token),
    };

    await completeSupplierSignupService(supplier.id, supplier.email, token, pending, db);

    const [linked] = await listLinkedSuppliersService(owner.id, db);
    expect(linked).toMatchObject({ userId: supplier.id, cuit });
  });

  it("only completes with the invite the data was entered for", async () => {
    const owner = await makeUser();
    const otherOwner = await makeUser();
    const supplier = await makeUser();
    const { token } = await createSupplierInviteService(owner.id, { label: "Molino" }, db);
    const other = await createSupplierInviteService(otherOwner.id, { label: "Molino" }, db);
    const pending = {
      businessName: "Molino San José",
      cuit: randomValidCuit(),
      contactName: "Ana Pérez",
      phone: "1155551234",
      categories: ["Harinas"],
      inviteTokenHash: hashInviteToken(token),
    };

    await expectAppError(
      completeSupplierSignupService(supplier.id, supplier.email, other.token, pending, db),
      "SUPPLIER_INVITE_INVALID",
    );
    await expectAppError(
      completeSupplierSignupService(supplier.id, supplier.email, token, { ...pending, inviteTokenHash: undefined }, db),
      "SUPPLIER_INVITE_INVALID",
    );
    await expect(listLinkedSuppliersService(otherOwner.id, db)).resolves.toEqual([]);
  });

  it("validates the pending data again (the owner can edit metadata)", async () => {
    const owner = await makeUser();
    const supplier = await makeUser();
    const { token } = await createSupplierInviteService(owner.id, { label: "Molino" }, db);

    await expect(
      completeSupplierSignupService(supplier.id, supplier.email, token, { cuit: "1", inviteTokenHash: hashInviteToken(token) }, db),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe("getHomePathService", () => {
  it("sends a supplier without a business to the supplier panel", async () => {
    const { owner, supplier } = await registeredSupplier();

    await expect(getHomePathService(supplier.id, db)).resolves.toBe("/proveedor");
    await expect(getHomePathService(owner.id, db)).resolves.toBe("/inicio");

    await db.insert(businesses).values({ ownerUserId: supplier.id, name: "También vendo" });
    await expect(getHomePathService(supplier.id, db)).resolves.toBe("/inicio");
  });

  it("keeps an emprendedor with a catalog but no business yet on the dashboard", async () => {
    const owner = await makeUser();
    const emprendedor = await makeUser();
    await createSupplyService(
      emprendedor.id,
      { kind: "supply", name: "Harina", purchasePrice: "100", purchaseQuantity: "1", purchaseUnit: "kg" },
      db,
    );
    const { token } = await createSupplierInviteService(owner.id, { label: "Vecino" }, db);
    await registerSupplierService(emprendedor.id, emprendedor.email, token, buildSupplierProfile(), db);

    await expect(getHomePathService(emprendedor.id, db)).resolves.toBe("/inicio");
  });
});
