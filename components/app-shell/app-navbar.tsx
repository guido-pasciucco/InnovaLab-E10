"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navSections, sectionFromPathname } from "./nav-sections";

// Section menu (catalog, tenders, and the chat tab when its flag is on).
// The sidebar lists the pages of the section chosen here.
export function AppNavbar({ chatDatosEnabled }: { chatDatosEnabled: boolean }) {
  const pathname = usePathname();
  const sections = navSections({ chatDatosEnabled });
  const current = sectionFromPathname(pathname, sections);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default bg-surface px-4 py-2 print:hidden sm:px-6">
      <nav aria-label="Secciones">
        <ul className="flex gap-1">
          {sections.map((section) => {
            const active = section.id === current.id;
            return (
              <li key={section.id}>
                <Link
                  href={section.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-[14px] px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                    active
                      ? "bg-brand-green-50 text-brand-green-700"
                      : "text-fg-muted hover:bg-brand-green-50 hover:text-brand-green-700"
                  }`}
                >
                  {section.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
