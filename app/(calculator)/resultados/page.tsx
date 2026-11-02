import type { Metadata } from "next";

import { BreakEvenStep } from "@/components/calculator/break-even-step";

export const metadata: Metadata = {
  title: "Punto de equilibrio",
};

export default function ResultadosPage() {
  return <BreakEvenStep />;
}
