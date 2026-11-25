"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_SECTIONS, sectionFromPathname } from "./nav-sections";

// Section menu (catalog, tenders). The sidebar lists the pages of the
// section chosen here.
export function AppNavbar() {
  const pathname = usePathname();
  const current = sectionFromPathname(pathname);

  return (
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border-default bg-surface px-4 py-1.5 print:hidden sm:px-5">
      <nav aria-label="Secciones">
        <ul className="flex max-w-full gap-1 overflow-x-auto">
          {NAV_SECTIONS.map((section) => {
            const active = section.id === current.id;
            return (
              <li key={section.id}>
                <Link
                  href={section.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-xl px-3.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
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
