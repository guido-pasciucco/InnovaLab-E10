import Link from "next/link";

import { CalculatorIcon } from "./icons";

type BrandMarkProps = {
  tone?: "dark" | "light";
};

export function BrandMark({ tone = "dark" }: BrandMarkProps) {
  const title = tone === "light" ? "text-on-action-primary" : "text-fg";
  const tagline = tone === "light" ? "text-on-brand-muted" : "text-fg-muted";

  return (
    <Link
      href="/"
      aria-label="Calculadora de Costos, ir al inicio"
      className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-action-primary text-on-action-primary shadow-md shadow-action-primary/20">
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
