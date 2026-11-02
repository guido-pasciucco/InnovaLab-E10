import Link from "next/link";

import { BreakEvenPreviewChart } from "./break-even-preview-chart";
import { ArrowRightIcon, CheckCircleIcon, TargetIcon } from "./icons";
import { container, eyebrow, sectionLead, sectionTitle } from "./styles";

const checklist = [
  "Cuántas ventas necesitás para cubrir tus costos fijos y variables.",
  "Cuánto ganás por encima del punto de equilibrio.",
  "Cómo cambia el escenario si subís o bajás el precio.",
] as const;

export function BreakEvenSection() {
  return (
    <section id="modelo" aria-labelledby="break-even-title" className="scroll-mt-36 py-16 sm:py-20">
      <div className={`${container} grid gap-12 lg:grid-cols-2 lg:items-center`}>
        <div>
          <p className={eyebrow}>Punto de equilibrio</p>
          <h2 id="break-even-title" className={sectionTitle}>
            Descubrí cuántas unidades necesitás vender para{" "}
            <span className="text-[#0B6B4F]">dejar de perder dinero.</span>
          </h2>
          <p className={sectionLead}>
            El punto de equilibrio te muestra el mínimo de ventas que necesitás para cubrir tus
            costos. Sin adivinar. Sin esperar al cierre del mes.
          </p>

          <ul className="mt-6 space-y-3">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#486055]">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#0B6B4F]" />
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/paso-1"
            className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B6B4F] hover:text-[#08543E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B4F]"
          >
            Calculá tu punto de equilibrio
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-[28px] border border-[#DCEBE2] bg-white p-4 shadow-[0_24px_70px_-40px_rgba(11,107,79,0.45)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF7F0] text-[#0B6B4F]">
                <TargetIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#122B22]">Punto de equilibrio</p>
                <p className="mt-0.5 text-[11px] text-[#6C8077]">Celular Funda · escenario estándar</p>
              </div>
            </div>
            <span className="rounded-full bg-[#EAF7F0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0B6B4F]">
              Ejemplo
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#6C8077]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-[#0B6B4F]" />
              Ingresos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-[#486055]" />
              Costos totales
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-4 border-t-2 border-dashed border-[#B98A3D]" />
              Costos fijos
            </span>
          </div>

          <div className="mt-2">
            <BreakEvenPreviewChart />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#E4EEE8] pt-4 sm:gap-3">
            <PreviewMetric label="Costo fijo mensual" value="$180.000" />
            <PreviewMetric label="Costo unitario" value="$21.065" />
            <PreviewMetric label="Precio de venta" value="$24.900" />
          </div>

          <p className="mt-4 rounded-xl bg-[#EAF7F0] px-3 py-2.5 text-xs leading-5 text-[#365447]">
            Vendé <strong className="font-bold text-[#0B6B4F]">47 unidades</strong> para cubrir tus
            costos. A partir de ahí, cada venta suma a tu ganancia.
          </p>
        </div>
      </div>
    </section>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] leading-4 text-[#6C8077]">{label}</p>
      <p className="mt-1 text-sm font-semibold tracking-[-0.01em] text-[#122B22]">{value}</p>
    </div>
  );
}
