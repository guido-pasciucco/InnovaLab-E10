// Shared public navigation. Pure data so the header, the footer and the pages
// describe the same three functionalities without duplicating labels or paths.
// Every section link is absolute: it has to work from any marketing page.

export type MarketingSection = {
  label: string;
  hash: string;
};

export type FunctionalityPage = {
  /** Stable id used for the dropdown's aria-controls and menu state. */
  id: "calculadora" | "licitaciones" | "asistente";
  label: string;
  href: string;
  sections: readonly MarketingSection[];
  ctaLabel: string;
  /** Private destination behind the page's main button. */
  destination: string;
};

export const functionalityPages: readonly FunctionalityPage[] = [
  {
    id: "calculadora",
    label: "Calculadora de costos",
    href: "/calculadora-de-costos",
    sections: [
      { label: "Ver todo", hash: "" },
      { label: "Cómo funciona", hash: "#como-funciona" },
      { label: "Punto de equilibrio", hash: "#equilibrio" },
      { label: "Preguntas", hash: "#preguntas" },
    ],
    ctaLabel: "Calcular mis costos",
    destination: "/inicio",
  },
  {
    id: "licitaciones",
    label: "Licitaciones",
    href: "/licitaciones-de-insumos",
    sections: [
      { label: "Ver todo", hash: "" },
      { label: "Qué es", hash: "#que-es" },
      { label: "Cómo funciona", hash: "#como-funciona" },
      { label: "Tus proveedores", hash: "#proveedores" },
      { label: "Preguntas", hash: "#preguntas" },
    ],
    ctaLabel: "Publicar una compra",
    destination: "/licitaciones",
  },
  {
    id: "asistente",
    label: "Asistente IA",
    href: "/asistente-ia",
    sections: [
      { label: "Ver todo", hash: "" },
      { label: "Chat con tus datos", hash: "#chat-con-tus-datos" },
      { label: "Mora, tu ayuda", hash: "#mora" },
      { label: "Tus datos seguros", hash: "#privacidad" },
      { label: "Preguntas", hash: "#preguntas" },
    ],
    ctaLabel: "Preguntarle a mis datos",
    destination: "/chat-datos",
  },
] as const;

export const generalPage = {
  ctaLabel: "Empezar gratis",
  destination: "/inicio",
} as const;

/**
 * A marketing CTA points at a private route. Anonymous visitors go through
 * /login?next=... and come back to that route once the session is created;
 * signed-in visitors go straight there.
 */
export function destinationHref(path: string, isSignedIn: boolean): string {
  return isSignedIn ? path : `/login?next=${encodeURIComponent(path)}`;
}

export function sectionHref(page: FunctionalityPage, section: MarketingSection): string {
  return `${page.href}${section.hash}`;
}

export function currentPage(pathname: string): FunctionalityPage | null {
  return functionalityPages.find((page) => pathname === page.href) ?? null;
}

/** Header CTA: the page's own action, or the general one on `/`. */
export function headerCta(pathname: string) {
  const page = currentPage(pathname);
  return page
    ? { label: page.ctaLabel, destination: page.destination }
    : { label: generalPage.ctaLabel, destination: generalPage.destination };
}
