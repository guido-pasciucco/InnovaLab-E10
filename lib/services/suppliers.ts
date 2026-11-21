import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { and, desc, eq, gt, isNull } from "drizzle-orm";

import { businesses } from "@/lib/db/business/table";
import { getDrizzleClient, type Db } from "@/lib/db/client";
import { profiles } from "@/lib/db/profile/table";
import { supplies } from "@/lib/db/supplies/table";
import { supplierInvites, supplierLinks, suppliers, type Supplier } from "@/lib/db/suppliers/table";
import {
  createSupplierInviteInputSchema,
  inviteTokenSchema,
  supplierProfileInputSchema,
  supplierSignupInputSchema,
  type SupplierProfileInput,
} from "@/lib/db/suppliers/validation";
import { AppError } from "@/lib/errors/app-error";
import { signupService, type VerifiedUserId } from "@/lib/services/auth";

export type { Supplier };

// Supplier registry for supply tenders (docs/licitaciones RN-22 and RN-23).
//
// - The emprendedor generates a personal invite link: single use, valid for
//   7 days. Only the SHA-256 of the token is stored.
// - A new supplier registers through the link: the account is created by
//   Supabase Auth, which asks to confirm the email first. The supplier row and
//   the link to the emprendedor are written once the email is confirmed
//   (completeSupplierSignupService), so "antes de crear la cuenta, el
//   proveedor confirma su mail" holds.
// - An existing supplier (same CUIT, RN-23) signs in and accepts the link:
//   no second account, one more link.
//
// Owner scoping: emprendedor reads filter by the session user id
// (VerifiedUserId, ADR 03). Services throw; doors translate.

export const SUPPLIER_INVITE_TTL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const UNNAMED_OWNER = "Emprendedor sin nombre";

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

// Postgres unique violation, unwrapped from Drizzle's query error.
function uniqueViolation(err: unknown): string | null {
  const candidates = [err, (err as { cause?: unknown } | null)?.cause];
  for (const candidate of candidates) {
    const pgError = candidate as { code?: string; constraint_name?: string } | null;
    if (pgError?.code === "23505") return pgError.constraint_name ?? "";
  }
  return null;
}

export type CreatedSupplierInvite = { token: string; label: string; expiresAt: Date };

export async function createSupplierInviteService(
  userId: VerifiedUserId,
  input: unknown,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<CreatedSupplierInvite> {
  const { label } = createSupplierInviteInputSchema.parse(input);
  const token = newInviteToken();
  const expiresAt = new Date(now.getTime() + SUPPLIER_INVITE_TTL_DAYS * DAY_MS);

  await db.insert(supplierInvites).values({
    ownerUserId: userId,
    label,
    tokenHash: hashInviteToken(token),
    expiresAt,
    createdAt: now,
  });

  return { token, label, expiresAt };
}

export type SupplierInviteStatus = "pending" | "used" | "expired";

export type SupplierInviteView = {
  id: string;
  label: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  status: SupplierInviteStatus;
  supplierBusinessName: string | null;
};

export async function listSupplierInvitesService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<SupplierInviteView[]> {
  const rows = await db
    .select({
      id: supplierInvites.id,
      label: supplierInvites.label,
      createdAt: supplierInvites.createdAt,
      expiresAt: supplierInvites.expiresAt,
      usedAt: supplierInvites.usedAt,
      supplierBusinessName: suppliers.businessName,
    })
    .from(supplierInvites)
    .leftJoin(suppliers, eq(suppliers.userId, supplierInvites.usedBySupplierUserId))
    .where(eq(supplierInvites.ownerUserId, userId))
    .orderBy(desc(supplierInvites.createdAt), supplierInvites.id);

  return rows.map((row) => ({
    ...row,
    status: row.usedAt ? "used" : row.expiresAt <= now ? "expired" : "pending",
  }));
}

export type LinkedSupplier = Pick<
  Supplier,
  "userId" | "businessName" | "cuit" | "contactName" | "phone" | "email" | "categories"
> & { linkedAt: Date };

// The emprendedor's supplier list (RN-05, RN-08). Never reveals which other
// emprendedores a supplier is linked to (RN-22).
export async function listLinkedSuppliersService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<LinkedSupplier[]> {
  return db
    .select({
      userId: suppliers.userId,
      businessName: suppliers.businessName,
      cuit: suppliers.cuit,
      contactName: suppliers.contactName,
      phone: suppliers.phone,
      email: suppliers.email,
      categories: suppliers.categories,
      linkedAt: supplierLinks.createdAt,
    })
    .from(supplierLinks)
    .innerJoin(suppliers, eq(suppliers.userId, supplierLinks.supplierUserId))
    .where(eq(supplierLinks.ownerUserId, userId))
    .orderBy(suppliers.businessName, suppliers.userId);
}

export type SupplierInviteLookup =
  | { status: "valid"; ownerUserId: string; ownerName: string; label: string }
  | { status: "invalid" };

// Public lookup for the invite page: no session needed. Unknown, used and
// expired links answer the same, so the page cannot be used to probe tokens.
export async function getSupplierInviteService(
  token: string,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<SupplierInviteLookup> {
  if (!inviteTokenSchema.safeParse(token).success) return { status: "invalid" };

  const [row] = await db
    .select({
      ownerUserId: supplierInvites.ownerUserId,
      ownerName: profiles.displayName,
      label: supplierInvites.label,
    })
    .from(supplierInvites)
    .innerJoin(profiles, eq(profiles.id, supplierInvites.ownerUserId))
    .where(
      and(
        eq(supplierInvites.tokenHash, hashInviteToken(token)),
        isNull(supplierInvites.usedAt),
        gt(supplierInvites.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row) return { status: "invalid" };
  return {
    status: "valid",
    ownerUserId: row.ownerUserId,
    ownerName: row.ownerName ?? UNNAMED_OWNER,
    label: row.label,
  };
}

export async function getSupplierService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<Supplier | null> {
  const [row] = await db.select().from(suppliers).where(eq(suppliers.userId, userId)).limit(1);
  return row ?? null;
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Marks the invite used by this supplier and links both accounts. Runs inside
// the caller's transaction; the conditional update is what makes the link
// single use when two requests race.
async function consumeInvite(
  tx: Tx,
  supplierUserId: VerifiedUserId,
  token: string,
  now: Date,
): Promise<{ ownerUserId: string }> {
  const [invite] = await tx
    .update(supplierInvites)
    .set({ usedAt: now, usedBySupplierUserId: supplierUserId })
    .where(
      and(
        eq(supplierInvites.tokenHash, hashInviteToken(token)),
        isNull(supplierInvites.usedAt),
        gt(supplierInvites.expiresAt, now),
      ),
    )
    .returning({ ownerUserId: supplierInvites.ownerUserId });

  if (!invite) throw new AppError("SUPPLIER_INVITE_INVALID");

  await tx
    .insert(supplierLinks)
    .values({ ownerUserId: invite.ownerUserId, supplierUserId, createdAt: now })
    .onConflictDoNothing();

  return invite;
}

async function requireValidInviteFor(
  userId: VerifiedUserId,
  token: string,
  db: Db,
  now: Date,
): Promise<Extract<SupplierInviteLookup, { status: "valid" }>> {
  const invite = await getSupplierInviteService(token, db, now);
  if (invite.status !== "valid") throw new AppError("SUPPLIER_INVITE_INVALID");
  if (invite.ownerUserId === userId) throw new AppError("SUPPLIER_INVITE_OWN");
  return invite;
}

// Writes the supplier data for a signed-in account (email already confirmed)
// and links it to the emprendedor of the invite, in one transaction.
async function registerSupplier(
  userId: VerifiedUserId,
  email: string,
  token: string,
  profile: SupplierProfileInput,
  termsAcceptedAt: Date,
  db: Db,
  now: Date,
): Promise<{ ownerName: string }> {
  const invite = await requireValidInviteFor(userId, token, db, now);

  if (await getSupplierService(userId, db)) throw new AppError("SUPPLIER_ALREADY_REGISTERED");
  const [taken] = await db
    .select({ userId: suppliers.userId })
    .from(suppliers)
    .where(eq(suppliers.cuit, profile.cuit))
    .limit(1);
  if (taken) throw new AppError("SUPPLIER_CUIT_TAKEN");

  try {
    await db.transaction(async (tx) => {
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
      await consumeInvite(tx, userId, token, now);
    });
  } catch (err) {
    // A concurrent request may have taken the CUIT or registered this account.
    const constraint = uniqueViolation(err);
    if (constraint === "suppliers_cuit_unique") throw new AppError("SUPPLIER_CUIT_TAKEN");
    if (constraint === "suppliers_pkey") throw new AppError("SUPPLIER_ALREADY_REGISTERED");
    throw err;
  }

  return { ownerName: invite.ownerName };
}

// Signed-in account that is not a supplier yet (for example, it confirmed its
// email but the link had expired, or it is an emprendedor account that also
// sells): it types the supplier data and accepts the terms in the same form.
export async function registerSupplierService(
  userId: VerifiedUserId,
  email: string | undefined,
  token: string,
  input: unknown,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<{ ownerName: string }> {
  const profile = supplierProfileInputSchema.parse(input);
  if (!email) throw new AppError("UNAUTHORIZED");
  return registerSupplier(userId, email, token, profile, now, db, now);
}

// An account that already is a supplier opens a new emprendedor's link: it is
// linked, and the link is spent (RN-22, RN-23).
export async function acceptSupplierInviteService(
  userId: VerifiedUserId,
  token: string,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<{ ownerName: string }> {
  const invite = await requireValidInviteFor(userId, token, db, now);
  if (!(await getSupplierService(userId, db))) throw new AppError("SUPPLIER_REQUIRED");

  await db.transaction(async (tx) => {
    await consumeInvite(tx, userId, token, now);
  });

  return { ownerName: invite.ownerName };
}

// Metadata key holding the supplier data until the email is confirmed.
export const PENDING_SUPPLIER_KEY = "pending_supplier";

// New account through the invite link. Checks the link and the CUIT before
// asking Supabase Auth to create the account, so a taken CUIT never gets as
// far as a confirmation email. The supplier data waits in the account
// metadata until the email is confirmed.
export async function startSupplierSignupService(
  client: SupabaseClient,
  token: string,
  input: unknown,
  emailRedirectTo: string,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<Record<string, never>> {
  const { email, password, businessName, cuit, contactName, phone, categories } =
    supplierSignupInputSchema.parse(input);
  const profile = { businessName, cuit, contactName, phone, categories };

  const invite = await getSupplierInviteService(token, db, now);
  if (invite.status !== "valid") throw new AppError("SUPPLIER_INVITE_INVALID");

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
    // The invite's hash binds the pending data to this link: completing with
    // any other link is refused, so a crafted link cannot register the
    // supplier with a different emprendedor.
    {
      [PENDING_SUPPLIER_KEY]: {
        ...profile,
        termsAcceptedAt: now.toISOString(),
        inviteTokenHash: hashInviteToken(token),
      },
    },
  );
}

// Called once the email is confirmed (the confirmation link lands on the
// invite's completion route with a session). Reads the pending data from the
// account metadata, validates it again (metadata is editable by its owner)
// and registers the supplier.
export async function completeSupplierSignupService(
  userId: VerifiedUserId,
  email: string | undefined,
  token: string,
  pending: unknown,
  db: Db = getDrizzleClient(),
  now: Date = new Date(),
): Promise<{ ownerName: string }> {
  const data = (pending ?? {}) as { termsAcceptedAt?: unknown; inviteTokenHash?: unknown };
  // The data was entered for one invite; any other link is not valid for it.
  if (data.inviteTokenHash !== hashInviteToken(token)) throw new AppError("SUPPLIER_INVITE_INVALID");
  const profile = supplierProfileInputSchema.parse({ ...data, acceptTerms: true });
  const acceptedAt =
    typeof data.termsAcceptedAt === "string" && !Number.isNaN(Date.parse(data.termsAcceptedAt))
      ? new Date(data.termsAcceptedAt)
      : now;
  if (!email) throw new AppError("UNAUTHORIZED");
  return registerSupplier(userId, email, token, profile, acceptedAt, db, now);
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

export type SupplierEmprendedor = { ownerUserId: string; ownerName: string; linkedAt: Date };

// The supplier's side of RN-22: the emprendedores it is linked to.
export async function listSupplierEmprendedoresService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<SupplierEmprendedor[]> {
  const rows = await db
    .select({
      ownerUserId: supplierLinks.ownerUserId,
      ownerName: profiles.displayName,
      linkedAt: supplierLinks.createdAt,
    })
    .from(supplierLinks)
    .innerJoin(profiles, eq(profiles.id, supplierLinks.ownerUserId))
    .where(eq(supplierLinks.supplierUserId, userId))
    .orderBy(supplierLinks.createdAt);

  return rows.map((row) => ({ ...row, ownerName: row.ownerName ?? UNNAMED_OWNER }));
}

// Where a signed-in account lands: a supplier that has never used the
// emprendedor side (no business and no catalog) goes to its panel; everyone
// else keeps the emprendedor dashboard.
export async function getHomePathService(
  userId: VerifiedUserId,
  db: Db = getDrizzleClient(),
): Promise<"/proveedor" | "/dashboard"> {
  const supplier = await getSupplierService(userId, db);
  if (!supplier) return "/dashboard";
  const [[business], [supply]] = await Promise.all([
    db.select({ id: businesses.id }).from(businesses).where(eq(businesses.ownerUserId, userId)).limit(1),
    db.select({ id: supplies.id }).from(supplies).where(eq(supplies.userId, userId)).limit(1),
  ]);
  return business || supply ? "/dashboard" : "/proveedor";
}
