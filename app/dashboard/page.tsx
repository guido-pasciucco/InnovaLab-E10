import Link from "next/link";
import { redirect } from "next/navigation";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";
import LogoutButton from "./logout-button";

// Protected demo page: reads session server-side via RSC helper.
// Browser never imports Supabase; all auth is mediated via cookies.
export default async function DashboardPage() {
  let user: { id: string; email?: string } | null = null;

  try {
    const supabase = await createRscSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      user = { id: data.user.id, email: data.user.email ?? undefined };
    }
  } catch {
    // Missing env -> treat as unauthenticated; route will show guidance.
    user = null;
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          This is a protected page. Session was validated server-side via{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5">supabase.auth.getUser()</code>.
        </p>

        <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-sm font-semibold text-gray-700">Authenticated user</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="font-medium text-gray-600">ID:</dt>
              <dd className="font-mono text-gray-900 break-all">{user.id}</dd>
            </div>
            {user.email && (
              <div className="flex gap-2">
                <dt className="font-medium text-gray-600">Email:</dt>
                <dd className="text-gray-900">{user.email}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="mt-6 rounded-md border border-blue-100 bg-blue-50 p-4">
          <h2 className="text-sm font-semibold text-blue-900">Profile linkage (Drizzle example)</h2>
          <p className="mt-1 text-sm text-blue-800">
            To fetch user-owned data, use <code className="rounded bg-blue-100 px-1">user.id</code>{" "}
            from the validated session as the filter — never trust a client-sent id.
          </p>
          <pre className="mt-3 overflow-x-auto rounded bg-white p-3 text-xs text-gray-800">
            {`// Drizzle: filter by owner_user_id from validated session
// RLS additionally enforces auth.uid() = owner_user_id as safety net
await db.select().from(profiles)
  .where(eq(profiles.owner_user_id, user.id));`}
          </pre>
          <p className="mt-2 text-xs text-blue-700">
            See <Link href="/profile" className="font-medium underline">/profile</Link> for the dedicated profile demo.
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href="/profile"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View profile
          </Link>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
