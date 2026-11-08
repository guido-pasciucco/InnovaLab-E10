import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { AppError } from "@/lib/errors/app-error";
import { getCalculatorProgressService } from "@/lib/services/calculator";
import {
  listCalcCostLinesService,
  type CalcCostLineList,
} from "@/lib/services/cost";
import { FixedCostsStep } from "@/components/calculator/fixed-costs-step";

async function listFixedCosts(userId: string): Promise<CalcCostLineList> {
  try {
    return await listCalcCostLinesService(userId, { behavior: "fixed" });
  } catch (err) {
    // The progress says step 2 is open, so a missing draft means the user has
    // to save step 1 again before there is anything to attach costs to.
    if (err instanceof AppError && err.code === "CALC_DRAFT_MISSING") {
      redirect("/paso-1");
    }
    throw err;
  }
}

export default async function Paso2Page() {
  const user = await requireUser();
  const { currentStep } = await getCalculatorProgressService(user.id);

  // Not reachable yet: send the user to the furthest step they may open.
  if (currentStep < 2) redirect(`/paso-${currentStep}`);

  const { lines, totalFixed } = await listFixedCosts(user.id);

  // Only what the table shows crosses to the client: no timestamps, no
  // server-owned dimensions.
  return (
    <FixedCostsStep
      lines={lines.map(({ id, concept, amount }) => ({ id, concept, amount }))}
      totalFixed={totalFixed}
    />
  );
}
