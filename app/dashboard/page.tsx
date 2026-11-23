import { redirect } from "next/navigation";

// The old flow 2 dashboard is gone: the app lives in flow 1 (navbar +
// sidebar). Keep the URL working for bookmarks and old links, and send the
// user to /inicio, which picks flow 1 or the supplier panel.
export default function LegacyDashboardPage() {
  redirect("/inicio");
}
