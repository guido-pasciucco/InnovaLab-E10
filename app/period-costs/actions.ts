"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { handleActionErrors } from "@/lib/errors/handle-action-errors";
import {
  addPeriodCostLineService,
  removePeriodCostLineService,
  updatePeriodCostLineService,
} from "@/lib/services/business-cost";

const PERIOD_COSTS_PATH = "/period-costs";

// Server Actions for the period expenses screen (#243). The services resolve
// the business from the session user, so the client never sends an owner or a
// business id. `revalidatePath` re-renders the page with the saved lines and
// the total the server derived from them.

export const removePeriodCostLine = handleActionErrors(async (lineId: string) => {
  const user = await requireUser();

  const line = await removePeriodCostLineService(user.id, lineId);

  revalidatePath(PERIOD_COSTS_PATH);

  return { id: line.id };
});

type SavePeriodCostLineInput = {
  // Present on edit; the create path omits it and the server assigns the id.
  id?: string;
  period?: string;
  concept: string;
  amountPeriod: string;
};

// Single entry point of the catalog modal (#285): one call saves both fields,
// so a failed save cannot leave a line half edited. The saved row is
// returned so the client can refresh its list and total without a round trip.
export const savePeriodCostLine = handleActionErrors(
  async (_prev: unknown, data: SavePeriodCostLineInput) => {
    const user = await requireUser();
    const { id, ...input } = data;

    const line = id
      ? await updatePeriodCostLineService(user.id, id, input)
      : await addPeriodCostLineService(user.id, input);

    revalidatePath(PERIOD_COSTS_PATH);

    return {
      id: line.id,
      period: line.period,
      concept: line.concept,
      amountPeriod: line.amountPeriod,
    };
  },
);
