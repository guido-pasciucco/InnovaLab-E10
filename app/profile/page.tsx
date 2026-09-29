import Link from "next/link";
import { redirect } from "next/navigation";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";

// Profile demo: shows how to link auth.users to application data.
// The user.id comes from the validated server session — the only trusted
// source. A Drizzle query would filter by owner_user_id = user.id, with
// RLS policy auth.uid() = owner_user_id as defense-in-depth.
export default async function ProfilePage() {
  let user: { id: string; email?: string } | null = null;

  try {
    const supabase = await createRscSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      user = { id: data.user.id, email: data.user.email ?? undefined };
    }
  } catch {
    user = null;
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-sm text-gray-600">
          Data for this page is fetched server-side. The browser never imports the Supabase
          client — it only talks to <code className="rounded bg-gray-100 px-1">/api/*</code>.
        </p>

        <div className="mt-6 rounded-md border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700">Identity (from auth.users)</h2>
          <dl className="mt-2 space-y-2 text-sm">
            <div>
              <dt className="font-medium text-gray-600">User ID</dt>
              <dd className="mt-1 font-mono break-all text-gray-900">{user.id}</dd>
              <p className="mt-1 text-xs text-gray-500">
                This is the primary key in <code>auth.users</code>. Application tables reference
                it as <code>owner_user_id uuid references auth.users(id)</code>.
              </p>
            </div>
            {user.email && (
              <div>
                <dt className="font-medium text-gray-600">Email</dt>
                <dd className="mt-1 text-gray-900">{user.email}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="mt-6 rounded-md border border-amber-100 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Drizzle linkage pattern (no migration in this demo)</h2>
          <pre className="mt-2 overflow-x-auto rounded bg-white p-3 text-xs text-gray-800">
            {`// Never: where owner_user_id = body.userId  (client-controlled)
// Always: derive userId from validated session
const { data: { user } } = await supabase.auth.getUser();
if (!user) return unauthorized();

// Drizzle query filtered by session user
const rows = await db
  .select()
  .from(businesses)
  .where(eq(businesses.owner_user_id, user.id));

// Postgres RLS as safety net:
// create policy "owner_only" on businesses
//   for all using (auth.uid() = owner_user_id);`}
          </pre>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign in as another user
          </Link>
        </div>
      </div>
    </main>
  );
}
