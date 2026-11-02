import Link from "next/link";
import type { ComponentType } from "react";

import {
  ArrowRightIcon,
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
    title: "Configuración comercial",
    description: "Definí tu negocio: qué vendés, en qué escala y con qué costos fijos y variables.",
    icon: GridIcon,
  },
  {
    number: "02",
    title: "Costos fijos y variables",
    description: "Registrá tus costos y gastos, y clasificalos como fijos o variables.",
    icon: WalletIcon,
  },
  {
    number: "03",
    title: "Costos por producto",
    description: "Conocé el costo real de cada producto y su participación en tu rentabilidad.",
    icon: PackageIcon,
  },
  {
    number: "04",
    title: "Punto de equilibrio",
    description: "Calculá cuántas unidades necesitás vender para cubrir tus costos y no perder plata.",
    icon: TargetIcon,
    featured: true,
  },
  {
    number: "05",
    title: "Proyección de rentabilidad",
    description: "Modelá tus ganancias según distintos niveles de ventas y precios.",
    icon: TrendingUpIcon,
  },
  {
    number: "06",
    title: "Probá distintos escenarios",
    description: "Compará cómo cambia tu rentabilidad según el precio que elegís.",
    icon: SlidersIcon,
  },
  {
    number: "07",
    title: "Simulación de 3 escenarios comparables",
    description:
      "Vas a poder ver cómo se mueve tu rentabilidad con cada cambio de precio, en tiempo real.",
    icon: LayersIcon,
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
            <span className="text-link">7 pasos</span>
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
              } ${step.wide ? "sm:col-span-2 lg:col-span-3" : ""}`}
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
                    Ver cómo funciona
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
