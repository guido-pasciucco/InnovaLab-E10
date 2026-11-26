"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { registerSupplierService, startSupplierSignupService } from "@/lib/services/suppliers";
import { getSiteOrigin } from "@/lib/site-origin";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";

// Doors of the public supplier registration (#309): no token, no invitation
// and no emprendedor link. The services revalidate all the data.

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

// New account: Supabase Auth creates it and mails the confirmation link,
// which lands on /auth/confirm and continues to the completion route.
export const startSupplierSignup = handleActionErrors(
  async (_previous: unknown, data: FormData): Promise<{ email: string }> => {
    const emailRedirectTo = `${getSiteOrigin(await headers())}/auth/confirm?next=/proveedores/registro/completar`;
    const input = { ...formFields(data), email: data.get("email"), password: data.get("password") };
    await startSupplierSignupService(await createRscSupabaseClient(), input, emailRedirectTo);
    return { email: String(data.get("email") ?? "") };
  },
  "AUTH_UNAVAILABLE",
);

// Signed-in account that is not a supplier yet.
export const registerSupplier = handleActionErrors(async (_previous: unknown, data: FormData) => {
  const user = await requireUser();
  await registerSupplierService(user.id, user.email, formFields(data));
  redirect("/proveedor");
});
