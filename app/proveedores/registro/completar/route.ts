import { redirect, unstable_rethrow } from "next/navigation";

import { toAppError } from "@/lib/errors/app-error";
import { getSessionUserService } from "@/lib/services/auth";
import {
  clearPendingSupplierSignupService,
  completeSupplierSignupService,
  readPendingSupplierSignupService,
} from "@/lib/services/suppliers";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";

// Where the confirmation email continues after /auth/confirm opened the
// session (RN-23: the email is confirmed before the supplier row exists).
// Writes the supplier row from the data kept in the account metadata and opens
// the supplier panel. On failure it goes back to the public form, which
// explains the code and offers the form again.
export async function GET() {
  const client = await createRscSupabaseClient();
  const user = await getSessionUserService(client).catch((err: unknown) => {
    unstable_rethrow(err);
    return null;
  });
  if (!user) redirect(`/login?next=${encodeURIComponent("/proveedores/registro")}`);

  const pending = await readPendingSupplierSignupService(client);
  if (!pending) redirect("/proveedores/registro");

  let failure: string | null = null;
  try {
    await completeSupplierSignupService(user.id, user.email, pending);
    await clearPendingSupplierSignupService(client);
  } catch (err) {
    unstable_rethrow(err);
    failure = toAppError(err).code;
  }

  // redirect() throws, so it stays outside the try.
  if (failure === "SUPPLIER_ALREADY_REGISTERED") redirect("/proveedor");
  if (failure) redirect(`/proveedores/registro?error=${failure}`);
  redirect("/proveedor");
}
