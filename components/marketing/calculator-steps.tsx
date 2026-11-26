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
  number: string;
  title: string;
  description: string;
  icon: ComponentType<IconProps>;
  featured?: boolean;
};

// The order matches the private menu: Insumos, Productos, Gastos del período,
// Costo total, Precios y Equilibrio. Nothing here promises work in progress.
const steps: readonly Step[] = [
  {
    number: "01",
    title: "Insumos y packaging",
    description: "Lo que comprás, con su precio y su unidad de compra.",
    icon: PackageIcon,
  },
  {
    number: "02",
    title: "Productos",
    description:
      "La receta, el rendimiento y las presentaciones en que vendés (unidad, caja x6), con cuántas hacés por mes.",
    icon: GridIcon,
  },
  {
    number: "03",
    title: "Gastos del período",
    description:
      "Lo que pagás cada mes vendas o no: alquiler, servicios, tu propio sueldo. Se carga una sola vez.",
    icon: WalletIcon,
  },
  {
    number: "04",
    title: "Costo total",
    description: "Los gastos del mes se reparten según cuánto hacés de cada producto.",
    icon: LayersIcon,
  },
  {
    number: "05",
    title: "Precios",
    description:
      "Un recargo sobre el costo, por defecto o por producto, que da el precio sugerido, la ganancia y el margen real.",
    icon: TrendingUpIcon,
  },
  {
    number: "06",
    title: "Equilibrio",
    description:
      "Cuántas unidades de cada producto vender en el mes para cubrir los gastos, con su gráfico.",
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
              key={step.number}
              className={`flex h-full flex-col rounded-2xl border p-5 ${
                step.featured
                  ? "border-brand-tile bg-brand-tile text-on-action-primary shadow-xl shadow-brand-tile/20"
                  : "border-border-default bg-surface-tint"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${
                    step.featured ? "bg-surface/10 text-on-brand-accent" : "bg-action-tonal text-link"
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
