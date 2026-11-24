"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import LogoutButton from "@/components/auth/logout-button";

import { isActivePath, sectionFromPathname } from "./nav-sections";

type AppSidebarProps = {
  userName: string;
  userEmail: string;
  businessName: string;
};

// Basic sidebar for the new flow (flow 1): the pages of the section chosen in
// the navbar. Placeholder until the UX/UI redesign defines the final
// navigation.
export function AppSidebar({ userName, userEmail, businessName }: AppSidebarProps) {
  const pathname = usePathname();
  const section = sectionFromPathname(pathname);

  return (
    <aside className="flex w-full print:hidden shrink-0 flex-col gap-6 border-b border-border-default bg-surface p-4 md:min-h-screen md:w-64 md:border-r md:border-b-0">
      <div>
        <p className="text-lg font-bold text-brand-green-700">Calculadora de Costos</p>
        {businessName && <p className="mt-1 truncate text-sm text-fg-muted">{businessName}</p>}
      </div>

      <nav aria-label="Principal">
        <ul className="flex gap-2 md:flex-col">
          {section.items.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-[14px] px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                    active
                      ? "bg-brand-green-50 text-brand-green-700"
                      : "text-fg-muted hover:bg-brand-green-50 hover:text-brand-green-700"
                  }`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section
        aria-label="Perfil"
        className="flex flex-col gap-3 rounded-2xl bg-surface-tint p-3 md:mt-auto"
      >
        <dl className="min-w-0 text-sm">
          {userName && <dd className="truncate font-semibold text-fg">{userName}</dd>}
          {userEmail && <dd className="truncate text-fg-muted">{userEmail}</dd>}
        </dl>
        <LogoutButton />
      </section>
    </aside>
  );
}
