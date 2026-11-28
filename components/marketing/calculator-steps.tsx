import Link from "next/link";
import type { ComponentType } from "react";

import {
  ArrowRightIcon,
  GridIcon,
  LayersIcon,
  PackageIcon,
  TargetIcon,
  TrendingUpIcon,
  WalletIcon,
  type IconProps,
} from "@/components/home/icons";
import { container, eyebrow, sectionLead, sectionTitle } from "@/components/home/styles";

type Step = {
  title: string;
  description: string;
  icon: ComponentType<IconProps>;
  featured?: boolean;
};

// The order matches the private menu, using the public wording of each step.
const steps: readonly Step[] = [
  {
    title: "Insumos y packaging",
    description: "Lo que comprás, con su precio y su unidad de compra.",
    icon: PackageIcon,
  },
  {
    title: "Productos",
    description: "La receta, las presentaciones y las cantidades que querés fabricar.",
    icon: GridIcon,
  },
  {
    title: "Costos fijos",
    description: "Lo que pagás cada mes vendas o no.",
    icon: WalletIcon,
  },
  {
    title: "Costo total",
    description: "Lo que verdaderamente cuesta fabricar tu producto.",
    icon: LayersIcon,
  },
  {
    title: "Precios",
    description: "Elegí vos tu porcentaje de ganancia.",
    icon: TrendingUpIcon,
  },
  {
    title: "Punto de Equilibrio",
    description: "En base a lo que producís, cuánto deberías vender para no perder dinero.",
    icon: TargetIcon,
    featured: true,
  },
];

export function CalculatorSteps({ ctaHref }: { ctaHref: string }) {
  return (
    <section
      id="como-funciona"
      aria-labelledby="steps-title"
      className="scroll-mt-36 border-y border-border-default bg-surface py-16 sm:py-20"
    >
      <div className={container}>
        <div className="max-w-3xl">
          <p className={eyebrow}>El recorrido</p>
          <h2 id="steps-title" className={sectionTitle}>
            Seis pasos, en el mismo orden que el menú de tu negocio
          </h2>
          <p className={sectionLead}>
            Podés cargar cada cosa cuando quieras: no hay pasos bloqueados. Los resultados se
            recalculan solos al cambiar un dato.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.title}
              className={`flex h-full flex-col rounded-2xl border p-5 ${
                step.featured
                  ? "border-brand-tile bg-brand-tile text-on-action-primary shadow-xl shadow-brand-tile/20"
                  : "border-border-default bg-surface-tint"
              }`}
            >
              <div className="flex items-start justify-end">
                <step.icon
                  className={`h-5 w-5 ${step.featured ? "text-on-brand-accent" : "text-link"}`}
                />
              </div>
              <h3
                className={`mt-4 text-base font-semibold tracking-[-0.01em] ${
                  step.featured ? "text-on-action-primary" : "text-fg"
                }`}
              >
                {step.title}
              </h3>
              <p
                className={`mt-2 flex-1 text-sm leading-6 ${
                  step.featured ? "text-on-brand" : "text-fg-muted"
                }`}
              >
                {step.description}
              </p>
              {step.featured ? (
                <Link
                  href={ctaHref}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-on-brand-accent hover:text-on-action-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
                >
                  Ver mi equilibrio
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
