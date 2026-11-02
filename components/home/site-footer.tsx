import Link from "next/link";

import { BrandMark } from "./brand-mark";
import { container } from "./styles";

type FooterLink = {
  href: string;
  label: string;
};

type FooterColumnProps = {
  title: string;
  links: readonly FooterLink[];
};

const productLinks: readonly FooterLink[] = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#modelo", label: "Punto de equilibrio" },
  { href: "#escenarios", label: "Escenarios" },
  { href: "#testimonios", label: "Testimonios" },
];

const accountLinks: readonly FooterLink[] = [
  { href: "/login", label: "Iniciar sesión" },
  { href: "/signup", label: "Crear cuenta" },
  { href: "/paso-1", label: "Calculadora" },
];

const helpLinks: readonly FooterLink[] = [
  { href: "#faq", label: "Preguntas frecuentes" },
  { href: "#privacidad", label: "Privacidad" },
];

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#8FB6A5]">{title}</h2>
      <ul className="mt-4 space-y-3 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            {link.href.startsWith("#") ? (
              <a
                href={link.href}
                className="rounded-md text-[#D7E9E0] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="rounded-md text-[#D7E9E0] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[#08291F] font-sans text-[#D7E9E0]">
      <div className={`${container} py-14`}>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <BrandMark tone="light" />
            <p className="mt-5 text-sm leading-6 text-[#A9C9BA]">
              La herramienta que te ayuda a poner precios con información real, entender tu margen y
              saber cuándo tu negocio empieza a ganar.
            </p>
          </div>

          <FooterColumn title="Producto" links={productLinks} />
          <FooterColumn title="Cuenta" links={accountLinks} />
          <FooterColumn title="Ayuda" links={helpLinks} />
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-[#8FB6A5] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Calculadora de Costos. Todos los derechos reservados.</p>
          <p>Hecho para emprendedores.</p>
        </div>
      </div>
    </footer>
  );
}
