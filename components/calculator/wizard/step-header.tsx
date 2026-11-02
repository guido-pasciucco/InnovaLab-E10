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
      <span className="inline-block rounded-full border border-[#86e0a3] bg-[#d9f7e3] px-4 py-1 text-sm font-semibold uppercase text-[#136831]">
        Paso {currentStep} de 7
      </span>

      <h1 className="text-3xl font-bold text-[#0a2a1a] sm:text-4xl">{title}</h1>

      {description && <p className="text-base text-gray-600">{description}</p>}
    </div>
  );
}
