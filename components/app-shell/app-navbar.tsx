"use client";

import { Sparkle } from "lucide-react";
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
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border-default bg-surface px-4 py-1.5 print:hidden sm:px-5">
      <nav aria-label="Secciones">
        <ul className="flex max-w-full gap-1 overflow-x-auto">
          {sections.map((section) => {
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
                  {section.id === "chat-datos" ? <ChatDatosLabel label={section.label} /> : section.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

function ChatDatosLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <span aria-hidden="true" className="relative inline-block h-4 w-5 text-[#6B3FA0]">
        <Sparkle aria-hidden="true" className="absolute bottom-0 left-0 fill-current" size={13} strokeWidth={2} />
        <Sparkle aria-hidden="true" className="absolute top-0 right-0 fill-current" size={8} strokeWidth={2} />
      </span>
    </span>
  );
}
