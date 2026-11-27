import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";

import { businesses } from "@/lib/db/business/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { supplies } from "@/lib/db/supplies/table";
import { suppliers, type Supplier } from "@/lib/db/suppliers/table";
import {
  supplierProfileInputSchema,
  supplierSignupInputSchema,
  type SupplierProfileInput,
} from "@/lib/db/suppliers/validation";
import { AppError } from "@/lib/errors/app-error";
import { signupService, type VerifiedUserId } from "@/lib/services/auth";

export type { Supplier };

// Public supplier registry for supply tenders (issue #309, RN-22 and RN-23).
//
// Any person can register as a supplier without an invitation: the same
// business/CUIT/contact/categories data, the same CUIT validation and the same
// email confirmation as before. There are no invite links, no 7-day expiry and
// no supplier-emprendedor link table: every registered supplier sees every
// active tender.
//
// - A new supplier uses signupService, which asks Supabase Auth to confirm the
//   email first. The supplier data waits in the account metadata until the
//   confirmation link lands on the completion route, where the supplier row is
//   written (completeSupplierSignupService).
// - An account that already exists (emprendedor that also sells) only needs to
//   type its supplier data and accept the terms (registerSupplierService).
//
// Services throw; doors translate. Reads that are not owner-scoped (the public
// registry) are only called from pages behind requireUser().
// ---------------------------------------------------------------------------

// Postgres unique violation, unwrapped from Drizzle's query error.
function uniqueViolation(err: unknown): string | null {
  const candidates = [err, (err as { cause?: unknown } | null)?.cause];
  for (const candidate of candidates) {
    const pgError = candidate as { code?: string; constraint_name?: string } | null;
    if (pgError?.code === "23505") return pgError.constraint_name ?? "";
  }
  return null;
}

export type PublicSupplier = Pick<
  Supplier,
  "userId" | "businessName" | "cuit" | "contactName" | "phone" | "email" | "categories"
> & { registeredAt: Date };

// The public registry shown to emprendedores: every registered supplier, with
// its rubros. It is not a private list per emprendedor (#309).
export async function listPublicSuppliersService(
  db: Db = getDrizzleClient(),
): Promise<PublicSupplier[]> {
  return db
    .select({
      userId: suppliers.userId,
      businessName: suppliers.businessName,
      cuit: suppliers.cuit,
      contactName: suppliers.contactName,
      phone: suppliers.phone,
      email: suppliers.email,
      categories: suppliers.categories,
      registeredAt: suppliers.createdAt,
    })
    .from(suppliers)
    .orderBy(suppliers.businessName, suppliers.userId);
}

export async function getSupplierService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<Supplier | null> {
  const [row] = await db.select().from(suppliers).where(eq(suppliers.userId, userId)).limit(1);
  return row ?? null;
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Writes the supplier row for a confirmed account. CUIT is unique, so one
// person cannot register twice even with two accounts (RN-23).
async function insertSupplier(
  tx: Tx,
  userId: VerifiedUserId,
  email: string,
  profile: SupplierProfileInput,
  termsAcceptedAt: Date,
  now: Date,
): Promise<void> {
  await tx.insert(suppliers).values({
    userId,
    businessName: profile.businessName,
    cuit: profile.cuit,
    contactName: profile.contactName,
    phone: profile.phone,
    email,
    categories: profile.categories,
    termsAcceptedAt,
    createdAt: now,
  });
}

async function registerSupplier(
  userId: VerifiedUserId,
  email: string,
  profile: SupplierProfileInput,
  termsAcceptedAt: Date,
  db: Db,
  now: Date,
): Promise<void> {
  if (await getSupplierService(userId, db)) throw new AppError("SUPPLIER_ALREADY_REGISTERED");
  const [taken] = await db
    .select({ userId: suppliers.userId })
    .from(suppliers)
    .where(eq(suppliers.cuit, profile.cuit))
    .limit(1);
  if (taken) throw new AppError("SUPPLIER_CUIT_TAKEN");

  try {
    await db.transaction(async (tx) => {
      await insertSupplier(tx, userId, email, profile, termsAcceptedAt, now);
    });
  } catch (err) {
    // A concurrent request may have taken the CUIT or registered this account.
    const constraint = uniqueViolation(err);
    if (constraint === "suppliers_cuit_unique") throw new AppError("SUPPLIER_CUIT_TAKEN");
    if (constraint === "suppliers_pkey") throw new AppError("SUPPLIER_ALREADY_REGISTERED");
    throw err;
  }
}

// Signed-in account that is not a supplier yet: types the supplier data and
// accepts the terms in the same form. No invitation, no emprendedor link.
export async function registerSupplierService(
  userId: VerifiedUserId,
  email: string | undefined,
  input: unknown,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<void> {
  const profile = supplierProfileInputSchema.parse(input);
  if (!email) throw new AppError("UNAUTHORIZED");
  return registerSupplier(userId, email, profile, now, db, now);
}

// Metadata key holding the supplier data until the email is confirmed.
export const PENDING_SUPPLIER_KEY = "pending_supplier";

// New account through the public registration form. Checks the CUIT before
// asking Supabase Auth to create the account, so a taken CUIT never gets as
// far as a confirmation email. The supplier data waits in the account metadata
// until the email is confirmed.
export async function startSupplierSignupService(
  client: SupabaseClient,
  input: unknown,
  emailRedirectTo: string,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<Record<string, never>> {
  const { email, password, businessName, cuit, contactName, phone, categories } =
    supplierSignupInputSchema.parse(input);
  const profile = { businessName, cuit, contactName, phone, categories };

  const [taken] = await db
    .select({ userId: suppliers.userId })
    .from(suppliers)
    .where(eq(suppliers.cuit, profile.cuit))
    .limit(1);
  if (taken) throw new AppError("SUPPLIER_CUIT_TAKEN");

  return signupService(
    client,
    { email, password, displayName: profile.businessName.slice(0, 80) },
    emailRedirectTo,
    { [PENDING_SUPPLIER_KEY]: { ...profile, termsAcceptedAt: now.toISOString() } },
  );
}

// Called once the email is confirmed. Reads the pending data from the account
// metadata, validates it again (metadata is editable by its owner) and writes
// the supplier row.
export async function completeSupplierSignupService(
  userId: VerifiedUserId,
  email: string | undefined,
  pending: unknown,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<void> {
  const data = (pending ?? {}) as { termsAcceptedAt?: unknown };
  const profile = supplierProfileInputSchema.parse({ ...data, acceptTerms: true });
  const acceptedAt =
    typeof data.termsAcceptedAt === "string" && !Number.isNaN(Date.parse(data.termsAcceptedAt))
      ? new Date(data.termsAcceptedAt)
      : now;
  if (!email) throw new AppError("UNAUTHORIZED");
  return registerSupplier(userId, email, profile, acceptedAt, db, now);
}

// Reads the pending supplier data of the signed-in account, or null.
export async function readPendingSupplierSignupService(client: SupabaseClient): Promise<unknown> {
  const { data } = await client.auth.getUser();
  return data.user?.user_metadata?.[PENDING_SUPPLIER_KEY] ?? null;
}

// Drops the pending data once the supplier row exists. Best effort: leftover
// metadata is harmless because the supplier row is what counts.
export async function clearPendingSupplierSignupService(client: SupabaseClient): Promise<void> {
  const { error } = await client.auth.updateUser({ data: { [PENDING_SUPPLIER_KEY]: null } });
  if (error) console.warn("[clearPendingSupplierSignupService]", error.message);
}

// A supplier that has never used the emprendedor side (no business and no
// catalog). The UI decides where such an account lands; this only answers
// which kind of account it is.
export async function isSupplierOnlyService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<boolean> {
  const supplier = await getSupplierService(userId, db);
  if (!supplier) return false;
  const [[business], [supply]] = await Promise.all([
    db.select({ id: businesses.id }).from(businesses).where(eq(businesses.ownerUserId, userId)).limit(1),
    db.select({ id: supplies.id }).from(supplies).where(eq(supplies.userId, userId)).limit(1),
  ]);
  return !business && !supply;
}
