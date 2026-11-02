import Link from "next/link";

type WizardProgressProps = {
  currentStep: number;
  completedSteps: number[];
  // Steps the user can jump to (by step number); the others are not links.
  hrefs?: Record<number, string>;
};

export function WizardProgress({
  currentStep,
  completedSteps,
  hrefs = {},
}: WizardProgressProps) {
  return (
    <nav aria-label="Progreso de la calculadora">
      <ol className="flex gap-1.5">
        {Array.from({ length: 7 }, (_, index) => {
          const step = index + 1;
          const isComplete = completedSteps.includes(step);
          const isCurrent = currentStep === step;
          const href = isCurrent ? undefined : hrefs[step];

          const bar = (
            <span
              className={`block h-1.5 rounded-full ${
                isComplete || isCurrent ? "bg-brand-green-600" : "bg-surface"
              }`}
            />
          );

          return (
            <li
              key={step}
              className="flex-1"
              data-step={step}
              data-complete={isComplete}
              data-current={isCurrent}
              aria-current={isCurrent ? "step" : undefined}
            >
              {href ? (
                <Link
                  href={href}
                  aria-label={`Ir al paso ${step}`}
                  className="block py-1.5 -my-1.5"
                >
                  {bar}
                </Link>
              ) : (
                bar
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
