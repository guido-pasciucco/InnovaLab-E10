import type { Metadata } from "next";

import { getOptionalUser } from "@/lib/auth/optional-user";
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

// The single-product wizard is gone. The catalog flow starts at Products.
const START_HREF = "/products";

// Server Component: reads the session only to pick the header state, so it
// renders on demand.
export default async function HomePage() {
  const user = await getOptionalUser();

  return (
    <>
      <SiteHeader startHref={START_HREF} isSignedIn={user !== null} />
      <main className="relative min-h-screen overflow-x-clip bg-surface-tint font-sans text-fg">
        <Hero startHref={START_HREF} />
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
