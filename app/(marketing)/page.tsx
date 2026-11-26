import type { Metadata } from "next";

import { FaqSection, type FaqItem } from "@/components/home/faq-section";
import { FinalCta } from "@/components/home/final-cta";
import { PrivacySection } from "@/components/home/privacy-section";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { destinationHref, generalPage } from "@/components/home/navigation";
import { FeatureCards } from "@/components/marketing/feature-cards";
import { GeneralHero } from "@/components/marketing/general-hero";
import { getOptionalUser } from "@/lib/auth/optional-user";

export const metadata: Metadata = {
  title: "Numora | Costos, compras e IA para emprendedores",
  description:
    "Calculá tus costos, comprá insumos con licitaciones y consultá tus datos con IA en un solo lugar.",
};

const faqs: readonly FaqItem[] = [
  {
    question: "¿Cuánto cuesta empezar?",
    answer:
      "Es gratis. No necesitás tarjeta ni instalar nada para crear tu cuenta y usar las tres funcionalidades.",
  },
  {
    question: "¿Mis datos están seguros?",
    answer:
      "Sí. Tu información queda asociada a tu cuenta y solo vos podés acceder a ella. No la compartimos con terceros ni la usamos para publicidad.",
  },
  {
    question: "¿Necesito saber de finanzas?",
    answer:
      "No. Las herramientas te guían: cargás tus datos y la aplicación hace las cuentas por vos. No hay fórmulas para memorizar.",
  },
];

export default async function HomePage() {
  const user = await getOptionalUser();
  const ctaHref = destinationHref(generalPage.destination, user !== null);

  return (
    <main>
      <GeneralHero ctaHref={ctaHref} />
      <FeatureCards />
      <TestimonialsSection />
      <PrivacySection />
      <FaqSection
        title="Preguntas frecuentes de emprendedores"
        lead="Las dudas que aparecen antes de empezar."
        faqs={faqs}
      />
      <FinalCta ctaHref={ctaHref} />
    </main>
  );
}
