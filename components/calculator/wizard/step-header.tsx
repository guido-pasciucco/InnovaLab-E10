type StepHeaderProps = {
  currentStep: number;
  title: string;
  description?: string;
};

export function StepHeader({
  currentStep,
  title,
  description,
}: StepHeaderProps) {
  return (
    <div className="space-y-2">
      <span className="inline-block rounded-full border border-border-default bg-action-tonal px-4 py-1 text-sm font-semibold uppercase text-on-action-tonal">
        Paso {currentStep} de 7
      </span>

      <h1 className="text-3xl font-bold text-fg sm:text-4xl">{title}</h1>

      {description && <p className="text-base text-fg-muted">{description}</p>}
    </div>
  );
}
