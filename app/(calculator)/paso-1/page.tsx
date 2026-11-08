import { requireUser } from "@/lib/auth/require-user";
import { getCalculatorDraftSetupService } from "@/lib/services/calculator";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";

import { SetupForm } from "@/components/calculator/setup-form";
import type { CalculatorSetup } from "@/lib/schemas/calculator-setup/calculator-setup";

export default async function Paso1Page() {
  await requireUser();

  const { setup } = await getCalculatorDraftSetupService(await createRscSupabaseClient());

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
