import { Gavel, Package, ShoppingBasket, Truck, Wallet, type LucideIcon } from "lucide-react";

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
      { href: "/period-costs", label: "Gastos del período", icon: Wallet },
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

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// The section a flow 1 path belongs to; the first one by default.
export function sectionFromPathname(pathname: string): NavSection {
  return (
    NAV_SECTIONS.find((section) => section.items.some((item) => isActivePath(pathname, item.href))) ??
    NAV_SECTIONS[0]
  );
}
