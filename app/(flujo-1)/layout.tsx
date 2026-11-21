import type { ReactNode } from "react";

import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { requireUser } from "@/lib/auth/require-user";
import { getProfileSummaryService } from "@/lib/services/profile";
import { getUserDefaultBusiness } from "@/lib/services/supplies";

// Flow 1 (new flow): every screen lives inside the sidebar shell.
export default async function FlowOneLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [profile, business] = await Promise.all([
    getProfileSummaryService(user.id),
    getUserDefaultBusiness(user.id),
  ]);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-surface-tint md:flex-row">
      <AppSidebar
        userName={profile.displayName ?? ""}
        userEmail={user.email ?? ""}
        businessName={business?.name ?? ""}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
