import Link from "next/link";

import { CalculatorIcon } from "./icons";

type BrandMarkProps = {
  tone?: "dark" | "light";
};

export function BrandMark({ tone = "dark" }: BrandMarkProps) {
  const title = tone === "light" ? "text-white" : "text-[#122B22]";
  const tagline = tone === "light" ? "text-[#A9C9BA]" : "text-[#5B6F65]";

  return (
    <Link
      href="/"
      aria-label="Calculadora de Costos, ir al inicio"
      className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0B6B4F]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B6B4F] text-white shadow-md shadow-[#0B6B4F]/20">
        <CalculatorIcon className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`text-[15px] font-bold tracking-[-0.01em] ${title}`}>
          Calculadora de Costos
        </span>
        <span className={`mt-1 text-[11px] font-medium ${tagline}`}>
          Precios con información real
        </span>
      </span>
    </Link>
  );
}
