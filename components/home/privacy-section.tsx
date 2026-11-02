import type { ComponentType } from "react";

import { EyeOffIcon, LockIcon, ShieldCheckIcon, type IconProps } from "./icons";
import { container } from "./styles";

type PrivacyPoint = {
  title: string;
  description: string;
  icon: ComponentType<IconProps>;
};

const privacyPoints: readonly PrivacyPoint[] = [
  {
    title: "Cifrado en tránsito",
    description: "Tu información viaja protegida en cada paso del cálculo.",
    icon: LockIcon,
  },
  {
    title: "Datos privados",
    description: "Solo vos podés ver tus costos, precios y resultados.",
    icon: EyeOffIcon,
  },
  {
    title: "Sin publicidad",
    description: "No vendemos ni compartimos tus datos con terceros.",
    icon: ShieldCheckIcon,
  },
];

export function PrivacySection() {
  return (
    <section id="privacidad" aria-labelledby="privacy-title" className="scroll-mt-36 pb-16 sm:pb-20">
      <div className={container}>
        <div className="relative overflow-hidden rounded-[32px] bg-[#0B3D2E] px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#1F7A5B]/40 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-[#0E6B4F]/30 blur-3xl"
          />

          <div className="relative max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#A7F3D0]">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              Privacidad por diseño
            </p>
            <h2
              id="privacy-title"
              className="mt-5 text-3xl font-semibold tracking-[-0.025em] text-white sm:text-4xl"
            >
              Tu información económica nunca sale de tu sesión.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#C9E6D8] sm:text-base">
              Tus datos se guardan de forma segura y solo vos podés acceder a ellos. No compartimos
              tu información con terceros ni la usamos para publicidad.
            </p>
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
            {privacyPoints.map((point) => (
              <div key={point.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <point.icon className="h-5 w-5 text-[#A7F3D0]" />
                <p className="mt-3 text-sm font-semibold text-white">{point.title}</p>
                <p className="mt-1 text-xs leading-5 text-[#A9C9BA]">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
