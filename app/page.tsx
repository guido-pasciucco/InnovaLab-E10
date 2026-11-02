import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";

import { getOptionalUser } from "@/lib/auth/optional-user";
import { getCalculatorProgressService } from "@/lib/services/calculator";
import { resumeHref } from "@/components/calculator/wizard/wizard-steps";
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

const CALCULATOR_START_HREF = "/paso-1";

// A signed-in user resumes at the furthest step saved in the database; anyone
// else, or anyone whose progress cannot be read, starts at the first step.
// The home must never break because of the calculator.
async function getCalculatorStartHref(): Promise<string> {
  const user = await getOptionalUser();
  if (!user) return CALCULATOR_START_HREF;

  try {
    const { currentStep } = await getCalculatorProgressService(user.id);
    return resumeHref(currentStep);
  } catch (err) {
    unstable_rethrow(err);
    console.error("[home] calculator progress failed", err);
    return CALCULATOR_START_HREF;
  }
}

// Server Component: reads the session only to pick where the main calls to
// action go, so it renders on demand.
export default async function HomePage() {
  const startHref = await getCalculatorStartHref();

  return (
    <>
      <SiteHeader startHref={startHref} />
      <main className="relative min-h-screen overflow-x-clip bg-surface-tint font-sans text-fg">
        <Hero startHref={startHref} />
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
