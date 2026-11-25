"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import LogoutButton from "@/components/auth/logout-button";
import { NumoraLogo } from "@/components/brand/numora-logo";

import { isActivePath, navSections, sectionFromPathname } from "./nav-sections";

type AppSidebarProps = {
  userName: string;
  userEmail: string;
  businessName: string;
  chatDatosEnabled: boolean;
};

// Basic sidebar for the new flow (flow 1): the pages of the section chosen in
// the navbar. Placeholder until the UX/UI redesign defines the final
// navigation.
export function AppSidebar({ userName, userEmail, businessName, chatDatosEnabled }: AppSidebarProps) {
  const pathname = usePathname();
  const section = sectionFromPathname(pathname, navSections({ chatDatosEnabled }));

  return (
    <aside className="flex w-full min-w-0 shrink-0 flex-col gap-5 border-b border-border-default bg-surface p-3.5 print:hidden md:fixed md:inset-y-0 md:left-0 md:h-screen md:w-56 md:border-r md:border-b-0">
      <div className="min-w-0">
        <Link href="/inicio" aria-label="Numora, ir al inicio" className="block h-8 w-36 overflow-hidden">
          <NumoraLogo variant="light" />
        </Link>
        {businessName && <p className="mt-1 truncate text-sm text-fg-muted">{businessName}</p>}
      </div>

      <nav aria-label="Principal">
        <ul className="flex max-w-full gap-1.5 overflow-x-auto md:flex-col md:overflow-visible">
          {section.items.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                    active
                      ? "bg-brand-green-50 text-brand-green-700"
                      : "text-fg-muted hover:bg-brand-green-50 hover:text-brand-green-700"
                  }`}
                >
                  <Icon aria-hidden="true" className="size-[18px]" />
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
