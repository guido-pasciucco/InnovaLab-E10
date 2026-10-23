import { requireUser } from "@/lib/auth/require-user";
import { getCalculatorSetupService } from "@/lib/services/calculator";

import { SetupForm } from "@/components/calculator/setup-form";
import type { CalculatorSetup } from "@/lib/schemas/calculator-setup/calculator-setup";

export default async function Paso1Page() {
  const user = await requireUser();

  const setup = await getCalculatorSetupService(user.id);

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-gray-900">Paso 1</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Configurá los datos iniciales de tu cálculo.
        </p>
        <SetupForm defaultValues={defaultValues} />
      </div>
    </main>
  );
}