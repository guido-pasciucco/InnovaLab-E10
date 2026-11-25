import type { ReactNode } from "react";

import { AppNavbar } from "@/components/app-shell/app-navbar";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { requireUser } from "@/lib/auth/require-user";

import { getShellIdentity } from "./shell-identity";

// Every emprendedor screen lives inside the navbar + sidebar shell.
export default async function FlowOneLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const { displayName, businessName } = await getShellIdentity(user.id);

  return (
    <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-clip bg-surface-tint md:flex-row">
      <AppSidebar userName={displayName} userEmail={user.email ?? ""} businessName={businessName} />
      <div className="min-w-0 max-w-full flex-1 pb-20">
        <AppNavbar />
        {children}
      </div>
    </div>
  );
}
