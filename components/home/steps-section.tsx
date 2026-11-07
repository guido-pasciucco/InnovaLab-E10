import Link from "next/link";
import type { ComponentType } from "react";

import {
  ArrowRightIcon,
  ChartIcon,
  GridIcon,
  LayersIcon,
  PackageIcon,
  SlidersIcon,
  TargetIcon,
  TrendingUpIcon,
  WalletIcon,
  type IconProps,
} from "./icons";
import { container, eyebrow, primaryButton, sectionLead, sectionTitle } from "./styles";

type Step = {
  number: string;
  title: string;
  description: string;
  icon: ComponentType<IconProps>;
  featured?: boolean;
  wide?: boolean;
};

const steps: readonly Step[] = [
  {
    number: "01",
    title: "Tu producto",
    description: "Definí qué vendés, en qué unidad y cuánto estimás vender por mes.",
    icon: GridIcon,
  },
  {
    number: "02",
    title: "Costos fijos",
    description: "Cargá los gastos mensuales que pagás vendas o no: alquiler, servicios, abonos.",
    icon: WalletIcon,
  },
  {
    number: "03",
    title: "Costos variables",
    description: "Registrá tus compras y cuántas unidades rinde cada una para obtener el costo por unidad.",
    icon: PackageIcon,
  },
  {
    number: "04",
    title: "Tu trabajo y costos indirectos",
    description: "Sumá el valor de tus horas y los gastos indirectos para llegar a tu costo unitario real.",
    icon: LayersIcon,
  },
  {
    number: "05",
    title: "Precio sugerido",
    description: "Elegí el margen que querés ganar y obtené tu precio sugerido y tu ganancia estimada.",
    icon: TrendingUpIcon,
  },
  {
    number: "06",
    title: "Punto de equilibrio",
    description: "Calculá cuántas unidades necesitás vender para cubrir tus costos y no perder plata.",
    icon: TargetIcon,
    featured: true,
  },
  {
    number: "07",
    title: "Compará escenarios",
    description: "Probá otros precios y volúmenes en hasta 3 escenarios, sin tocar tus datos originales.",
    icon: SlidersIcon,
  },
  {
    number: "08",
    title: "Resumen y ficha en PDF",
    description:
      "Revisá todos tus números en un resumen, copialo o descargá tu ficha de costos en PDF.",
    icon: ChartIcon,
    wide: true,
  },
];

export function StepsSection() {
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
            Al iniciar sesión, accedés al recorrido guiado en{" "}
            <span className="text-link">8 pasos</span>
          </h2>
          <p className={sectionLead}>
            Avanzás sabiendo dónde estás, qué te falta y cómo impacta cada cambio que hacés.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.number}
              className={`relative flex flex-col rounded-2xl border p-5 ${
                step.featured
                  ? "border-brand-tile bg-brand-tile text-on-action-primary shadow-xl shadow-brand-tile/20"
                  : "border-border-default bg-surface-tint"
              } ${step.wide ? "lg:col-span-2" : ""}`}
            >
              <div
                className={
                  step.wide
                    ? "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                    : "flex h-full flex-col"
                }
              >
                <div className={step.wide ? "max-w-2xl" : ""}>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${
                        step.featured
                          ? "bg-surface/10 text-on-brand-accent"
                          : "bg-action-tonal text-link"
                      }`}
                    >
                      {step.number}
                    </span>
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
                    className={`mt-2 text-sm leading-6 ${
                      step.featured ? "text-on-brand" : "text-fg-muted"
                    }`}
                  >
                    {step.description}
                  </p>
                </div>

                {step.featured ? (
                  <Link
                    href="/paso-1"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-on-brand-accent hover:text-on-action-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
                  >
                    Calcular mi equilibrio
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                ) : null}

                {step.wide ? (
                  <Link
                    href="/paso-1"
                    className={`${primaryButton} shrink-0 self-start sm:self-center`}
                  >
                    Empezá el recorrido
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
