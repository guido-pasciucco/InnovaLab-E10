import Link from "next/link";

import { ArrowRightIcon, SparklesIcon } from "@/components/home/icons";
import { container, primaryButton, secondaryButton } from "@/components/home/styles";

type GeneralHeroProps = {
  ctaHref: string;
};

export function GeneralHero({ ctaHref }: GeneralHeroProps) {
  return (
    <section aria-labelledby="general-hero-title" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-canvas/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-action-tonal/70 blur-3xl"
      />

      <div
        className={`${container} relative grid gap-10 pb-16 pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pb-24 lg:pt-20`}
      >
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border-default bg-action-tonal px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-link">
            <SparklesIcon className="h-3.5 w-3.5" />
            Herramientas gratuitas para emprendedores
          </p>

          <h1
            id="general-hero-title"
            className="mt-5 max-w-3xl text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-fg sm:text-[2.55rem] lg:text-[2.9rem]"
          >
            Numora: costos, compras e IA{" "}
            <span className="mt-2 block text-link">para emprendedores.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-6 text-fg-muted sm:text-[1.0625rem] sm:leading-7">
            Calculá el costo real de lo que vendés, comprá insumos con licitaciones y consultá tus
            datos con inteligencia artificial. Sin planillas ni fórmulas.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={ctaHref} className={primaryButton}>
              Empezar gratis
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <a href="#funcionalidades" className={secondaryButton}>
              Ver funcionalidades
            </a>
          </div>
        </div>

        <div className="rounded-[26px] border border-border-default bg-surface p-5 shadow-[0_28px_80px_-36px_rgba(11,107,79,0.5)] sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-link">
            Todo en un solo lugar
          </p>
          <ul className="mt-5 space-y-4">
            {[
              {
                title: "Calculadora de costos",
                body: "Tus productos, sus presentaciones y el equilibrio del negocio.",
              },
              {
                title: "Licitaciones de insumos",
                body: "Ofertas cerradas por rondas entre tus proveedores registrados.",
              },
              {
                title: "Asistente IA",
                body: "Preguntas en lenguaje natural sobre los datos de tu cuenta.",
              },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-action-primary" />
                <div>
                  <p className="text-sm font-semibold text-fg">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-fg-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
