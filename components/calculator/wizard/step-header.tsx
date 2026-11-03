import { TOTAL_STEPS } from "./wizard-steps";

type StepHeaderProps = {
  currentStep: number;
  title: string;
  description?: string;
  // Replaces "Paso N de T" when the step names its purpose instead (step 7,
  // "Comparación"). Shown uppercase.
  badge?: string;
};

export function StepHeader({
  currentStep,
  title,
  description,
  badge,
}: StepHeaderProps) {
  return (
    <div className="space-y-2 short:space-y-1">
      <span className="inline-block rounded-full border border-border-default bg-action-tonal px-4 py-1 text-sm font-semibold uppercase text-on-action-tonal">
        {badge ?? `Paso ${currentStep} de ${TOTAL_STEPS}`}
      </span>

      <h1 className="text-3xl font-bold text-fg sm:text-4xl short:sm:text-3xl">{title}</h1>

      {description && <p className="text-base text-fg-muted short:text-sm">{description}</p>}
    </div>
  );
}
