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

// Absolute links: the footer is shared by every marketing page, so a bare
// anchor would point at a section that may not exist on the current page.
const productLinks: readonly FooterLink[] = [
  { href: "/calculadora-de-costos", label: "Calculadora de costos" },
  { href: "/licitaciones-de-insumos", label: "Licitaciones de insumos" },
  { href: "/asistente-ia", label: "Asistente IA" },
];

const accountLinks: readonly FooterLink[] = [
  { href: "/login", label: "Iniciar sesión" },
  { href: "/signup", label: "Crear cuenta" },
  { href: "/inicio", label: "Ir a mi negocio" },
];

const helpLinks: readonly FooterLink[] = [
  { href: "/#testimonios", label: "Testimonios" },
  { href: "/#privacidad", label: "Privacidad" },
  { href: "/#preguntas", label: "Preguntas frecuentes" },
];

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-on-brand-muted">{title}</h2>
      <ul className="mt-4 space-y-3 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="rounded-md text-on-brand transition-colors hover:text-on-action-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-fg font-sans text-on-brand">
      <div className={`${container} py-14`}>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <BrandMark tone="light" />
            <p className="mt-5 text-sm leading-6 text-on-brand-muted">
              Costos, compras e IA para emprendedores. Poné precios con información real y decidí con
              datos.
            </p>
          </div>

          <FooterColumn title="Funcionalidades" links={productLinks} />
          <FooterColumn title="Cuenta" links={accountLinks} />
          <FooterColumn title="Ayuda" links={helpLinks} />
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-surface/10 pt-6 text-xs text-on-brand-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Numora. Todos los derechos reservados.</p>
          <p>Hecho para emprendedores.</p>
        </div>
      </div>
    </footer>
  );
}
