import { StepPlaceholder } from "@/components/calculator/wizard/step-placeholder";

// Navigation-only placeholder: replaced by the real step, with its own guard.
export default function Paso4Page() {
  return <StepPlaceholder step={4} />;
}
