import Link from "next/link";

import { ArrowRightIcon } from "./icons";
import { container, secondaryButtonOnDark } from "./styles";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="py-16 sm:py-20">
      <div className={container}>
        <div className="relative overflow-hidden rounded-[32px] bg-brand-tile px-6 py-14 text-center text-on-action-primary sm:px-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-surface/40 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-action-primary/30 blur-3xl"
          />

          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-brand-accent">
              Empezá hoy
            </p>
            <h2
              id="cta-title"
              className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.025em] sm:text-4xl"
            >
              ¿Listo para conocer el precio real de tus productos?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-on-brand sm:text-base">
              Calculá tus costos, definí tu precio y empezá a vender con confianza.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-surface px-5 py-3 text-sm font-semibold text-brand-tile transition-colors hover:bg-action-tonal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
              >
                Empezar gratis
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link href="/paso-1" className={secondaryButtonOnDark}>
                Ver demostración
              </Link>
            </div>

            <p className="mt-4 text-xs text-on-brand-muted">Sin tarjeta. Sin instalaciones.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
