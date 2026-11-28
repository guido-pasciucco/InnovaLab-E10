import type { Metadata } from "next";

import { FaqSection, type FaqItem } from "@/components/home/faq-section";
import { FinalCta } from "@/components/home/final-cta";
import { destinationHref, functionalityPages } from "@/components/home/navigation";
import { BreakEvenExample } from "@/components/marketing/break-even-example";
import { CalculatorHero } from "@/components/marketing/calculator-hero";
import { CalculatorSteps } from "@/components/marketing/calculator-steps";
import { getOptionalUser } from "@/lib/auth/optional-user";

export const metadata: Metadata = {
  title: "Numora | Calculadora de costos",
  description:
    "Del insumo al equilibrio: calculá el costo de todos tus productos, definí precios con un recargo y conocé cuánto tenés que vender.",
};

const calculator = functionalityPages[0];

const faqs: readonly FaqItem[] = [
  {
    question: "¿Puedo usarla si vendo más de un producto?",
    answer:
      "Sí. Cargás tus productos y los gastos del mes se reparten entre las cantidades que fabricás de cada uno.",
  },
  {
    question: "¿Cargo mi sueldo?",
    answer: "Sí, como un costo fijo más del mes.",
  },
  {
    question: "¿Qué pasa si sube un insumo?",
    answer:
      "Sólo actualizás el importe en insumo y Numora recalcula el resto automáticamente.",
  },
];

export default async function CalculatorPage() {
  const user = await getOptionalUser();
  const ctaHref = destinationHref(calculator.destination, user !== null);

  return (
    <main>
      <CalculatorHero ctaHref={ctaHref} />
      <CalculatorSteps ctaHref={ctaHref} />
      <BreakEvenExample />
      <FaqSection
        title="Preguntas sobre la calculadora"
        lead="Lo que suele preguntarse quien empieza a cargar sus costos."
        faqs={faqs}
      />
      <FinalCta
        ctaHref={ctaHref}
        ctaLabel="Calcular mis costos"
        title="¿Querés saber cuánto tenés que vender?"
        description="Cargá tus datos y mirá el equilibrio de tu negocio en unos minutos."
      />
    </main>
  );
}
