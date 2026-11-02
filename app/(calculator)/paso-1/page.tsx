import { requireUser } from "@/lib/auth/require-user";
import {
  getCalculatorCostSummaryService,
  getCalculatorDraftSetupService,
} from "@/lib/services/calculator";

import { SetupForm } from "@/components/calculator/setup-form";
import type { CalculatorSetup } from "@/lib/schemas/calculator-setup/calculator-setup";

export default async function Paso1Page() {
  const user = await requireUser();

  const [{ setup }, costSummary] = await Promise.all([
    getCalculatorDraftSetupService(user.id),
    // The card is secondary: invalid persisted costs must not take the form
    // down, so a failed summary renders the card with "—" and is logged.
    getCalculatorCostSummaryService(user.id).catch((error: unknown) => {
      console.error("[paso-1] cost summary failed", error);
      return null;
    }),
  ]);

  const defaultValues: CalculatorSetup = setup
    ? {
        name: setup.name,
        unit: setup.unit,
        volume: setup.volume,
        currency: setup.currency,
        period: setup.period,
      }
    : {
        name: "",
        unit: "",
        volume: 1,
        currency: "ARS",
        period: "Mensual",
      };

  return <SetupForm defaultValues={defaultValues} costSummary={costSummary} />;
}
