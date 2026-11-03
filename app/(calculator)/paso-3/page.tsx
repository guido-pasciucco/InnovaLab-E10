import Decimal from "decimal.js";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { AppError } from "@/lib/errors/app-error";
import {
  getCalculatorDraftSetupService,
  getCalculatorProgressService,
} from "@/lib/services/calculator";
import {
  listVariableCalcCostLinesService,
  type VariableCalcCostLineList,
} from "@/lib/services/cost";
import { VariableCostsStep } from "@/components/calculator/variable-costs-step";

async function listVariableCosts(userId: string): Promise<VariableCalcCostLineList> {
  try {
    return await listVariableCalcCostLinesService(userId);
  } catch (err) {
    // The progress says step 3 is open, so a missing draft means the user has
    // to save step 1 again before there is anything to attach costs to.
    if (err instanceof AppError && err.code === "CALC_DRAFT_MISSING") {
      redirect("/paso-1");
    }
    throw err;
  }
}

export default async function Paso3Page() {
  const user = await requireUser();
  const { currentStep } = await getCalculatorProgressService(user.id);

  // Not reachable yet: send the user to the furthest step they may open.
  if (currentStep < 3) redirect(`/paso-${currentStep}`);

  const [{ lines, totalVariable }, { setup }] = await Promise.all([
    listVariableCosts(user.id),
    getCalculatorDraftSetupService(user.id),
  ]);

  // Step 3 is open, so step 1 was saved; without a setup there is no unit to
  // count the yield in, and step 1 is where it is set.
  if (setup === null) redirect("/paso-1");

  // Only what the table shows crosses to the client: no timestamps, no
  // server-owned dimensions. The yield is normalized so the input shows what
  // the user typed ("20.0000" is "20"). The live card is the shell's: the
  // layout reads fixed total, variable per unit and volume from the persisted
  // summary.
  return (
    <VariableCostsStep
      lines={lines.map(({ id, concept, amount, yieldQuantity }) => ({
        id,
        concept,
        amount,
        yieldQuantity: new Decimal(yieldQuantity).toString(),
      }))}
      totalVariable={totalVariable}
      unit={setup.unit}
    />
  );
}
