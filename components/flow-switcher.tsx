"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// TEMPORARY: switches between the new flow (1: sidebar + catalogs) and the
// current flow (2: dashboard + wizard) while both coexist. Delete this file
// and its usage in app/layout.tsx once flow 2 is removed.
const FLOWS = [
  { id: 1, label: "Flujo 1", href: "/insumos", prefixes: ["/insumos", "/products"] },
  { id: 2, label: "Flujo 2", href: "/dashboard", prefixes: ["/dashboard", "/paso-", "/resultados"] },
] as const;

function flowFromPathname(pathname: string) {
  return FLOWS.find((flow) => flow.prefixes.some((prefix) => pathname.startsWith(prefix)));
}

export function FlowSwitcher() {
  const pathname = usePathname();
  const current = flowFromPathname(pathname);

  // Only signed-in app screens belong to a flow; public pages show nothing.
  if (!current) return null;

  return (
    <nav aria-label="Cambiar de flujo" className="flex justify-end px-4 pt-3">
      <div className="inline-flex gap-1 rounded-full bg-surface p-1 shadow-sm">
        {FLOWS.map((flow) => {
          const active = flow.id === current.id;
          return (
            <Link
              key={flow.id}
              href={flow.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                active
                  ? "bg-action-primary text-on-action-primary"
                  : "text-fg-muted hover:bg-brand-green-50 hover:text-brand-green-700"
              }`}
            >
              {flow.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
