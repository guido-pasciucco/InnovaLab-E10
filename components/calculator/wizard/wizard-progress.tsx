type WizardProgressProps = {
  currentStep: number;
  completedSteps: number[];
};

export function WizardProgress({
  currentStep,
  completedSteps,
}: WizardProgressProps) {
  return (
    <nav aria-label="Progreso de la calculadora">
      <ol className="flex gap-1.5">
        {Array.from({ length: 7 }, (_, index) => {
          const step = index + 1;
          const isComplete = completedSteps.includes(step);
          const isCurrent = currentStep === step;

          return (
            <li
              key={step}
              className={`h-1.5 flex-1 rounded-full ${
                isComplete || isCurrent ? "bg-brand-green-600" : "bg-white"
              }`}
              data-step={step}
              data-complete={isComplete}
              data-current={isCurrent}
              aria-current={isCurrent ? "step" : undefined}
            />
          );
        })}
      </ol>
    </nav>
  );
}
