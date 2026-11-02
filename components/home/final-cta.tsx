import Link from "next/link";

import { ArrowRightIcon } from "./icons";
import { container, secondaryButtonOnDark } from "./styles";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="py-16 sm:py-20">
      <div className={container}>
        <div className="relative overflow-hidden rounded-[32px] bg-[#0B3D2E] px-6 py-14 text-center text-white sm:px-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#1F7A5B]/40 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-[#0E6B4F]/30 blur-3xl"
          />

          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A7F3D0]">
              Empezá hoy
            </p>
            <h2
              id="cta-title"
              className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.025em] sm:text-4xl"
            >
              ¿Listo para conocer el precio real de tus productos?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#C9E6D8] sm:text-base">
              Calculá tus costos, definí tu precio y empezá a vender con confianza.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0B3D2E] transition-colors hover:bg-[#EAF7F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Empezar gratis
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link href="/paso-1" className={secondaryButtonOnDark}>
                Ver demostración
              </Link>
            </div>

            <p className="mt-4 text-xs text-[#8FB6A5]">Sin tarjeta. Sin instalaciones.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
