import { Gavel, MessageSquareText, Package, ShoppingBasket, Truck, type LucideIcon } from "lucide-react";

// Flow 1 navigation: the navbar switches between sections and the sidebar
// lists the pages of the current section.

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavSection = { id: string; label: string; href: string; items: readonly NavItem[] };

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    id: "catalogo",
    label: "Catálogo",
    href: "/insumos",
    items: [
      { href: "/insumos", label: "Insumos", icon: ShoppingBasket },
      { href: "/products", label: "Productos", icon: Package },
    ],
  },
  {
    id: "licitaciones",
    label: "Licitaciones",
    href: "/licitaciones",
    items: [
      { href: "/licitaciones", label: "Licitaciones", icon: Gavel },
      { href: "/proveedores", label: "Proveedores", icon: Truck },
    ],
  },
];

// Only listed when CHAT_DATOS_ENABLED is on (see navSections).
export const CHAT_DATOS_SECTION: NavSection = {
  id: "chat-datos",
  label: "Chateá con tus datos",
  href: "/chat-datos",
  items: [{ href: "/chat-datos", label: "Chat con tus datos", icon: MessageSquareText }],
};

// The sections the navbar lists. The chat tab only exists while its feature
// flag is on, so a switched-off deploy shows no trace of it.
export function navSections({ chatDatosEnabled }: { chatDatosEnabled: boolean }): readonly NavSection[] {
  return chatDatosEnabled ? [...NAV_SECTIONS, CHAT_DATOS_SECTION] : NAV_SECTIONS;
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// The section a flow 1 path belongs to; the first one by default.
export function sectionFromPathname(
  pathname: string,
  sections: readonly NavSection[] = NAV_SECTIONS,
): NavSection {
  return sections.find((section) => section.items.some((item) => isActivePath(pathname, item.href))) ?? sections[0];
}
