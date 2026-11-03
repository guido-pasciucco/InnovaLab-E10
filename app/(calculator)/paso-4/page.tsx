import { continueToStep6 } from "@/app/(calculator)/paso-4/actions";
import { StepPlaceholder } from "@/components/calculator/wizard/step-placeholder";

// Navigation-only placeholder: replaced by the real step, with its own guard.
// "Siguiente" skips step 5 (see continueToStep6).
export default function Paso4Page() {
  return <StepPlaceholder step={4} nextAction={continueToStep6} />;
}
