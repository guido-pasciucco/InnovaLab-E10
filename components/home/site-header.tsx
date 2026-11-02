import Link from "next/link";

import { BrandMark } from "./brand-mark";
import { ArrowRightIcon } from "./icons";
import { container, primaryButtonSmall } from "./styles";

const navigation = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#modelo", label: "Modelo" },
  { href: "#testimonios", label: "Testimonios" },
  { href: "#faq", label: "FAQ" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-surface-tint/95 font-sans backdrop-blur">
      <div className={`${container} flex items-center justify-between gap-4 py-4`}>
        <BrandMark />

        <nav aria-label="Navegación principal" className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-1 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-fg transition-colors hover:bg-surface hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:inline-flex"
          >
            Iniciar sesión
          </Link>
          <Link href="/paso-1" className={`${primaryButtonSmall} shrink-0`}>
            <span className="hidden sm:inline">Calcular mis costos</span>
            <span className="sm:hidden">Calcular</span>
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <nav
        aria-label="Navegación de secciones"
        className="flex gap-6 overflow-x-auto border-t border-border-default px-6 py-3 text-sm font-medium text-fg-muted lg:hidden"
      >
        {navigation.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-md py-1 transition-colors hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
