import { type NextRequest } from "next/server";
import { redirect, unstable_rethrow } from "next/navigation";

import { inviteTokenField as inviteTokenSchema } from "@/lib/schemas/suppliers/fields";
import { toAppError } from "@/lib/errors/app-error";
import { getSessionUserService, type SessionUser } from "@/lib/services/auth";
import {
  clearPendingSupplierSignupService,
  completeSupplierSignupService,
  readPendingSupplierSignupService,
} from "@/lib/services/suppliers";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";

type Context = { params: Promise<{ token: string }> };

// Where the supplier's confirmation email continues after /auth/confirm
// opened the session (docs/flujos/09-licitaciones.md RN-23: the email is confirmed before
// the supplier account exists). Writes the supplier row and the link to the
// emprendedor from the data kept in the account metadata, then opens the
// supplier panel. On failure it goes back to the invite page, which explains
// the code and offers the form again.
export async function GET(_request: NextRequest, { params }: Context) {
  const parsed = inviteTokenSchema.safeParse((await params).token);
  if (!parsed.success) redirect("/login");
  const token = parsed.data;
  const invitePath = `/proveedores/invitacion/${token}`;

  const client = await createRscSupabaseClient();
  let user: SessionUser | null = null;
  try {
    user = await getSessionUserService(client);
  } catch (err) {
    unstable_rethrow(err);
  }
  if (!user) redirect(`/login?next=${encodeURIComponent(invitePath)}`);

  const pending = await readPendingSupplierSignupService(client);
  if (!pending) redirect(invitePath);

  let failure: string | null = null;
  try {
    await completeSupplierSignupService(user.id, user.email, token, pending);
    await clearPendingSupplierSignupService(client);
  } catch (err) {
    unstable_rethrow(err);
    failure = toAppError(err).code;
  }

  // redirect() throws, so it stays outside the try.
  if (failure === "SUPPLIER_ALREADY_REGISTERED") redirect("/proveedor");
  if (failure) redirect(`${invitePath}?error=${failure}`);
  redirect("/proveedor");
}
