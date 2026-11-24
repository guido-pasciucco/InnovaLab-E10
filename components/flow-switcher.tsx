"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// TEMPORARY: switches between the new flow (1: navbar + sidebar, catalogs and
// tenders) and the current flow (2: dashboard + wizard) while both coexist.
// Flow 1 shows it in its navbar (AppNavbar); flow 2 shows it floating, from
// app/layout.tsx. Delete this file and its usages once flow 2 is removed.
type FlowId = 1 | 2;

const FLOWS = [
  { id: 1, label: "Flujo 1", href: "/insumos" },
  { id: 2, label: "Flujo 2", href: "/dashboard" },
] as const;

const FLOW_ONE_PATHS = ["/insumos", "/products", "/licitaciones", "/proveedores", "/chat-datos"];
const FLOW_TWO_PREFIXES = ["/dashboard", "/paso-", "/resultados"];

function under(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function flowFromPathname(pathname: string): FlowId | null {
  // The public invite link lives under /proveedores but belongs to no flow.
  if (pathname.startsWith("/proveedores/invitacion/")) return null;
  if (FLOW_ONE_PATHS.some((path) => under(pathname, path))) return 1;
  if (FLOW_TWO_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return 2;
  return null;
}

// The two-option pill; `current` is highlighted.
export function FlowSwitch({ current }: { current: FlowId }) {
  return (
    <nav aria-label="Cambiar de flujo">
      <div className="inline-flex gap-1 rounded-full bg-surface p-1 shadow-sm">
        {FLOWS.map((flow) => {
          const active = flow.id === current;
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

// Floating switcher for flow 2 screens. Flow 1 has it in its navbar, and
// public pages show nothing.
export function FlowSwitcher() {
  const pathname = usePathname();
  if (flowFromPathname(pathname) !== 2) return null;

  return (
    <div className="flex justify-end px-4 pt-3">
      <FlowSwitch current={2} />
    </div>
  );
}
