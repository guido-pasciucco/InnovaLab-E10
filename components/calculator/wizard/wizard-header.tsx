import Link from "next/link";

type WizardHeaderProps = {
  currentStep: number;
  totalSteps?: number;
};

function CalculatorLogo() {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 flex-col gap-1 rounded-[10px] bg-brand-tile p-1.5"
    >
      <span className="h-1.5 rounded-[2px] bg-brand-glyph" />
      <span className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className="size-1 rounded-full bg-brand-glyph" />
        ))}
      </span>
    </span>
  );
}

export function WizardHeader({
  currentStep,
  totalSteps = 7,
}: WizardHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CalculatorLogo />
        <h2 className="text-2xl font-bold text-brand-green-700">
          Calculadora de Costos
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Ir al dashboard
        </Link>
        <span className="rounded-full bg-surface/70 px-5 py-2 text-sm font-semibold text-fg-muted shadow-sm">
          Paso {currentStep} de {totalSteps}
        </span>
      </div>
    </header>
  );
}
