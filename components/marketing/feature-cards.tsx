import Link from "next/link";
import type { ComponentType } from "react";

import {
  ArrowRightIcon,
  CalculatorIcon,
  PackageIcon,
  SparklesIcon,
  type IconProps,
} from "@/components/home/icons";
import { container, eyebrow, sectionLead, sectionTitle } from "@/components/home/styles";

type Feature = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<IconProps>;
};

const features: readonly Feature[] = [
  {
    title: "Calculadora de costos",
    description:
      "De tus insumos al punto de equilibrio, con todos tus productos en un solo cálculo.",
    href: "/calculadora-de-costos",
    icon: CalculatorIcon,
  },
  {
    title: "Licitaciones de insumos",
    description: "Publicá una compra y compará ofertas cerradas de tus proveedores por rondas.",
    href: "/licitaciones-de-insumos",
    icon: PackageIcon,
  },
  {
    title: "Asistente IA",
    description: "Preguntale a tus datos en lenguaje natural y obtené respuestas con tablas y gráficos.",
    href: "/asistente-ia",
    icon: SparklesIcon,
  },
];

export function FeatureCards() {
  return (
    <section
      id="funcionalidades"
      aria-labelledby="features-title"
      className="scroll-mt-36 border-y border-border-default bg-surface py-16 sm:py-20"
    >
      <div className={container}>
        <div className="mx-auto max-w-3xl text-center">
          <p className={eyebrow}>Tres funcionalidades</p>
          <h2 id="features-title" className={sectionTitle}>
            Elegí por dónde querés empezar
          </h2>
          <p className={sectionLead}>
            Cada funcionalidad tiene su propia página con el detalle de lo que podés hacer hoy.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.href}
              className="flex flex-col rounded-2xl border border-border-default bg-surface-tint p-6"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-action-tonal text-link">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-[-0.01em] text-fg">
                {feature.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-fg-muted">{feature.description}</p>
              <Link
                href={feature.href}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:text-action-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Ver página
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
