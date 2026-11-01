type WizardHeaderProps = {
  currentStep: number;
  totalSteps?: number;
};

export function WizardHeader({
  currentStep,
  totalSteps = 7,
}: WizardHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-900">
        Calculadora de Costos
      </h2>

      <span className="rounded-full bg-brand-green-100 px-4 py-2 text-sm font-medium text-brand-green-700">
        Paso {currentStep} de {totalSteps}
      </span>
    </header>
  );
}
