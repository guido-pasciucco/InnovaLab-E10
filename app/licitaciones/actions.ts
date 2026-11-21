"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import type { PublishTenderFormValues } from "@/lib/schemas/tenders/publish";
import { cancelTenderService, publishTenderService } from "@/lib/services/tenders";

// Doors of the emprendedor's tender screens. Each one validates the session
// once and passes the raw input to the service, which validates it.

export const publishTender = handleActionErrors(
  async (_previous: unknown, payload: PublishTenderFormValues) => {
    const user = await requireUser();
    const { id } = await publishTenderService(user.id, payload);
    revalidatePath("/licitaciones");
    redirect(`/licitaciones/${id}`);
  },
);

export const cancelTender = handleActionErrors(async (_previous: unknown, data: FormData) => {
  const user = await requireUser();
  const tenderId = String(data.get("tenderId") ?? "");
  await cancelTenderService(user.id, tenderId);
  revalidatePath(`/licitaciones/${tenderId}`);
  revalidatePath("/licitaciones");
  return { cancelled: true as const };
});
