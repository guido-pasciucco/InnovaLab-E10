import type { CSSProperties } from "react";

import { requireUser } from "@/lib/auth/require-user";
import { getCalculatorSetupService } from "@/lib/services/calculator";

import { SetupForm } from "@/components/calculator/setup-form";
import type { CalculatorSetup } from "@/lib/schemas/calculator-setup/calculator-setup";

// Local stand-in for the green tokens that #170 will own in globals.css.
const GREEN_TOKENS = {
  "--brand-green-100": "#9fd5b3",
  "--brand-green-600": "#17803d",
  "--brand-green-700": "#136b33",
} as CSSProperties;

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
    <main
      style={GREEN_TOKENS}
      className="relative flex min-h-screen items-center justify-center px-4 py-6"
    >
      <div className="grid w-full max-w-6xl items-start gap-8 lg:grid-cols-[2fr_1fr]">
        <SetupForm defaultValues={defaultValues} />
      </div>
    </main>
  );
}
