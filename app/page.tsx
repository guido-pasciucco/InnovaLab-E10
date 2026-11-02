import type { Metadata } from "next";

import { BreakEvenSection } from "@/components/home/break-even-section";
import { FaqSection } from "@/components/home/faq-section";
import { FinalCta } from "@/components/home/final-cta";
import { Hero } from "@/components/home/hero";
import { PrivacySection } from "@/components/home/privacy-section";
import { ScenariosSection } from "@/components/home/scenarios-section";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { StepsSection } from "@/components/home/steps-section";
import { TestimonialsSection } from "@/components/home/testimonials-section";

export const metadata: Metadata = {
  title: "Calculadora de Costos | Fijá precios con información real",
  description:
    "Calculá el costo real de tus productos, conocé tu margen y encontrá tu punto de equilibrio en pocos pasos.",
};

// Server Component: the landing is static and renders without client-side JavaScript.
export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="relative min-h-screen overflow-x-clip bg-[#F7FBF8] font-sans text-[#122B22]">
        <Hero />
        <StepsSection />
        <BreakEvenSection />
        <ScenariosSection />
        <TestimonialsSection />
        <PrivacySection />
        <FaqSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
