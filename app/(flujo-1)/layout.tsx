import type { ReactNode } from "react";

import { AppNavbar } from "@/components/app-shell/app-navbar";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { requireUser } from "@/lib/auth/require-user";
import { isChatDatosEnabled } from "@/lib/chat-datos/config";
import { getProfileSummaryService } from "@/lib/services/profile";
import { getUserDefaultBusiness } from "@/lib/services/supplies";

// Flow 1 (new flow): every screen lives inside the navbar + sidebar shell.
export default async function FlowOneLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [profile, business] = await Promise.all([
    getProfileSummaryService(user.id),
    getUserDefaultBusiness(user.id),
  ]);
  // Read on the server: a switched-off deploy never ships the tab.
  const chatDatosEnabled = isChatDatosEnabled();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-surface-tint md:flex-row">
      <AppSidebar
        userName={profile.displayName ?? ""}
        userEmail={user.email ?? ""}
        businessName={business?.name ?? ""}
        chatDatosEnabled={chatDatosEnabled}
      />
      <div className="min-w-0 flex-1">
        <AppNavbar chatDatosEnabled={chatDatosEnabled} />
        {children}
      </div>
    </div>
  );
}
