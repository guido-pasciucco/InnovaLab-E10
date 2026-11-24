import { redirect } from "next/navigation";

// The old dashboard is gone. Keep the URL working for bookmarks and old links
// and send the user to /inicio, which picks the emprendedor home or the
// supplier panel.
export default function LegacyDashboardPage() {
  redirect("/inicio");
}
