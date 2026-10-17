import { requireUser } from "@/lib/auth/require-user";
import { handleRscErrors } from "@/lib/errors/handle-rsc-errors";
import { getCalculatorSetupService } from "@/lib/services/calculator";

import { SetupForm } from "@/components/calculator/setup-form";
import type { CalculatorSetup } from "@/lib/schemas/calculator-setup/calculator-setup";

export default async function Paso1Page() {
  const user = await requireUser();

  const setup = await handleRscErrors(() => getCalculatorSetupService(user.id));

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

  return <SetupForm defaultValues={defaultValues} />;
}