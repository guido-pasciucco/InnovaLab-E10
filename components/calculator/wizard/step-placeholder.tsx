import { StepHeader } from "@/components/calculator/wizard/step-header";
import { StepNav } from "@/components/calculator/wizard/step-nav";

type StepPlaceholderProps = {
  step: number;
  // Server Action for "Siguiente" when the placeholder must save progress
  // (step 4 skips step 5 this way). Without it, "Siguiente" links to the next
  // step.
  nextAction?: () => Promise<void>;
};

// Navigation-only stand-in for a step that is not built yet: replace the page
// that renders it with the real step.
export function StepPlaceholder({ step, nextAction }: StepPlaceholderProps) {
  return (
    <section className="rounded-[32px] bg-surface/80 p-5 shadow-[0_24px_48px_rgba(10,89,51,0.10)] sm:p-6">
      <StepHeader
        currentStep={step}
        title={`Paso ${step}`}
        description="Esta pantalla todavía no está disponible."
      />
      {nextAction ? (
        <StepNav previous={`/paso-${step - 1}`} nextAction={nextAction} />
      ) : (
        <StepNav
          previous={`/paso-${step - 1}`}
          next={step === 7 ? "/resultados" : `/paso-${step + 1}`}
        />
      )}
    </section>
  );
}
