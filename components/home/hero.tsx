import Link from "next/link";

import { HeroChart } from "./hero-chart";
import { ArrowRightIcon, ChartIcon, SparklesIcon } from "./icons";
import {
  container,
  primaryButton,
  primaryButtonSmall,
  secondaryButton,
} from "./styles";

const stats = [
  { value: "7 min", label: "de tu tiempo para calcular" },
  { value: "3 escenarios", label: "de costos para comparar" },
  { value: "0 fórmulas", label: "financieras complejas" },
] as const;

export function Hero({ startHref }: { startHref: string }) {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-[#C9F2DC]/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#DDF4E8]/70 blur-3xl"
      />

      <div
        className={`${container} relative grid gap-12 pb-16 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10 lg:pb-24 lg:pt-20`}
      >
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#C9E4D5] bg-[#EAF7F0] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B6B4F]">
            <SparklesIcon className="h-3.5 w-3.5" />
            Herramienta gratuita para emprendedores
          </p>

          <h1
            id="hero-title"
            className="mt-6 max-w-2xl text-[2.35rem] font-semibold leading-[1.06] tracking-[-0.035em] text-[#122B22] sm:text-5xl lg:text-[3.4rem]"
          >
            Fijá precios con información real.{" "}
            <span className="mt-2 block text-[#0B6B4F]">
              Chau a la intuición o copiar a la competencia.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-[#5B6F65] sm:text-lg sm:leading-8">
            Calculá el costo real de tus productos con un recorrido guiado, conocé tu margen de un vistazo
            y definí el precio correcto para tu negocio. Sin planillas de Excel ni fórmulas.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={startHref} className={primaryButton}>
              Calcular mis costos
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <a href="#como-funciona" className={secondaryButton}>
              Ver cómo funciona
            </a>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-[#DCEBE2] pt-6">
            {stats.map((stat) => (
              <div key={stat.value}>
                <p className="text-xl font-semibold tracking-[-0.02em] text-[#122B22] sm:text-2xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[#6C8077] sm:text-xs sm:leading-5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <HeroPanel />
      </div>
    </section>
  );
}

function HeroPanel() {
  return (
    <div className="relative">
      <div className="rounded-[28px] border border-[#D6E8DD] bg-white p-4 shadow-[0_28px_80px_-36px_rgba(11,107,79,0.5)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF7F0] text-[#0B6B4F]">
              <ChartIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#122B22]">Panel de Rentabilidad</p>
              <p className="mt-0.5 text-[11px] text-[#6C8077]">Celular Funda · últimos 6 meses</p>
            </div>
          </div>
          <span className="rounded-full bg-[#EAF7F0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0B6B4F]">
            Ejemplo
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          <HeroMetric label="Precio sugerido" value="$24.900" highlight />
          <HeroMetric label="Margen neto" value="15,4%" />
          <HeroMetric label="Ganancia por unidad" value="$3.835" />
        </div>

        <div className="mt-5 rounded-2xl border border-[#E4EEE8] bg-[#FBFDFC] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[#122B22]">Margen acumulado</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#6C8077]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0 w-4 border-t-2 border-dashed border-[#C4544A]" />
                Precio actual $21.400
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full bg-[#0B6B4F]" />
                Precio sugerido $24.900
              </span>
            </div>
          </div>
          <div className="mt-3">
            <HeroChart />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-[#EAF7F0] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-[#365447]">
            Con el precio sugerido ganás{" "}
            <strong className="font-bold text-[#0B6B4F]">$3.835</strong> por unidad que vendas.
            Empezá a construir tu rentabilidad.
          </p>
          <Link href="/paso-1" className={`${primaryButtonSmall} shrink-0`}>
            Ver demostración
          </Link>
        </div>
      </div>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-2.5 py-3 sm:px-3 ${
        highlight ? "border-[#0B6B4F] bg-[#0B6B4F] text-white" : "border-[#E4EEE8] bg-[#F7FBF8]"
      }`}
    >
      <p
        className={`text-[10px] font-medium leading-4 ${
          highlight ? "text-[#C9E6D8]" : "text-[#6C8077]"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-base font-semibold tracking-[-0.02em] sm:text-lg ${
          highlight ? "text-white" : "text-[#122B22]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
