import type { Metadata } from "next";

import { BreakEvenStep } from "@/components/calculator/break-even-step";

export const metadata: Metadata = {
  title: "Punto de equilibrio",
};

// No progress guard yet: steps 5 and 6 are placeholders that do not persist
// progress, so `currentStep` never reaches 7. Add the guard (as in paso-4)
// together with the real data once step 6 saves the price.
export default function Paso7Page() {
  return <BreakEvenStep />;
}
