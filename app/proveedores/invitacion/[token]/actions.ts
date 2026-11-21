"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { AppError } from "@/lib/errors/app-error";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { inviteTokenField as inviteTokenSchema } from "@/lib/schemas/suppliers/fields";
import {
  acceptSupplierInviteService,
  registerSupplierService,
  startSupplierSignupService,
} from "@/lib/services/suppliers";
import { getSiteOrigin } from "@/lib/site-origin";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";

// Doors of the invite page (docs/licitaciones RN-22, RN-23). The token travels
// in a hidden field; every service checks it again.

function readToken(data: FormData): string {
  const parsed = inviteTokenSchema.safeParse(data.get("token"));
  if (!parsed.success) throw new AppError("SUPPLIER_INVITE_INVALID");
  return parsed.data;
}

function formFields(data: FormData) {
  return {
    businessName: data.get("businessName"),
    cuit: data.get("cuit"),
    contactName: data.get("contactName"),
    phone: data.get("phone"),
    categories: data.get("categories"),
    acceptTerms: data.get("acceptTerms") ?? undefined,
  };
}

// New supplier: Supabase Auth creates the account and mails the confirmation
// link, which lands on /auth/confirm and continues to the completion route.
export const startSupplierSignup = handleActionErrors(
  async (_previous: unknown, data: FormData): Promise<{ email: string }> => {
    const token = readToken(data);
    const emailRedirectTo = `${getSiteOrigin(await headers())}/auth/confirm?next=/proveedores/invitacion/${token}/completar`;
    const input = { ...formFields(data), email: data.get("email"), password: data.get("password") };
    await startSupplierSignupService(await createRscSupabaseClient(), token, input, emailRedirectTo);
    return { email: String(data.get("email") ?? "") };
  },
  "AUTH_UNAVAILABLE",
);

// Signed-in account that is not a supplier yet.
export const registerSupplier = handleActionErrors(async (_previous: unknown, data: FormData) => {
  const user = await requireUser();
  await registerSupplierService(user.id, user.email, readToken(data), formFields(data));
  redirect("/proveedor");
});

// Existing supplier: one more emprendedor, same account.
export const acceptSupplierInvite = handleActionErrors(async (_previous: unknown, data: FormData) => {
  const user = await requireUser();
  await acceptSupplierInviteService(user.id, readToken(data));
  redirect("/proveedor");
});
