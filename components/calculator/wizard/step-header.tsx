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
    <div className="space-y-3">
      <span className="text-sm font-semibold uppercase tracking-wider text-brand-green-700">
        PASO {currentStep} DE 7
      </span>

      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>

      {description && <p className="text-base text-gray-600">{description}</p>}
    </div>
  );
}
