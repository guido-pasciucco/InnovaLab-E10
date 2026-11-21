"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import { createSupplierInviteService } from "@/lib/services/suppliers";
import { getSiteOrigin } from "@/lib/site-origin";

export type CreatedInviteLink = { link: string; label: string; expiresAt: string };

// Generates a personal invite link (RN-23). The raw token is returned once,
// inside the link; the database keeps only its hash.
export const createSupplierInvite = handleActionErrors(
  async (_previous: unknown, data: FormData): Promise<CreatedInviteLink> => {
    const user = await requireUser();
    const invite = await createSupplierInviteService(user.id, { label: data.get("label") });
    const link = `${getSiteOrigin(await headers())}/proveedores/invitacion/${invite.token}`;
    revalidatePath("/proveedores");
    return { link, label: invite.label, expiresAt: invite.expiresAt.toISOString() };
  },
);
