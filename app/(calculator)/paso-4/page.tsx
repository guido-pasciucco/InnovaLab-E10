import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { AppError } from "@/lib/errors/app-error";
import {
  getCalculatorCostSummaryService,
  getCalculatorProgressService,
} from "@/lib/services/calculator";
import {
  getOwnLaborService,
  listIndirectCalcCostLinesService,
} from "@/lib/services/own-labor";
import { OwnLaborStep } from "@/components/calculator/own-labor-step";

async function loadStep(userId: string) {
  try {
    return await Promise.all([
      getOwnLaborService(userId),
      listIndirectCalcCostLinesService(userId),
      // Same persisted source as the shell's live card. A failed summary
      // renders the unit cost box with "—" instead of taking the step down.
      getCalculatorCostSummaryService(userId).catch((error: unknown) => {
        console.error("[calculator] cost summary failed", error);
        return null;
      }),
    ]);
  } catch (err) {
    // The progress says step 4 is open, so a missing draft means the user has
    // to save step 1 again before there is anything to attach costs to.
    if (err instanceof AppError && err.code === "CALC_DRAFT_MISSING") {
      redirect("/paso-1");
    }
    throw err;
  }
}

export default async function Paso4Page() {
  const user = await requireUser();
  const { currentStep } = await getCalculatorProgressService(user.id);

  // Not reachable yet: send the user to the furthest step they may open.
  if (currentStep < 4) redirect(`/paso-${currentStep}`);

  const [ownLabor, { lines, totalIndirect }, summary] = await loadStep(user.id);

  // Only what the table shows crosses to the client: no timestamps, no
  // server-owned dimensions.
  return (
    <OwnLaborStep
      ownLabor={ownLabor}
      lines={lines.map(({ id, concept, amount }) => ({ id, concept, amount }))}
      totalIndirect={totalIndirect}
      unitCost={summary?.unitCost ?? null}
    />
  );
}
