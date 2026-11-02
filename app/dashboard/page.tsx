import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import LogoutButton from "./logout-button";

// Protected demo page: reads session server-side via RSC helper.
// Browser never imports Supabase; all auth is mediated via cookies.
export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="flex min-h-screen flex-col items-center bg-surface-tint px-4 py-12">
      <div className="w-full max-w-2xl rounded-lg bg-surface p-8 shadow-md">
        <h1 className="text-2xl font-bold text-fg">Dashboard</h1>
        <p className="mt-2 text-sm text-fg-muted">
          This is a protected page. Session was validated server-side via{" "}
          <code className="rounded bg-surface-tint px-1 py-0.5">supabase.auth.getUser()</code>.
        </p>

        <div className="mt-6 rounded-md border border-border-default bg-surface-tint p-4">
          <h2 className="text-sm font-semibold text-fg-muted">Authenticated user</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="font-medium text-fg-muted">ID:</dt>
              <dd className="font-mono text-fg break-all">{user.id}</dd>
            </div>
            {user.email && (
              <div className="flex gap-2">
                <dt className="font-medium text-fg-muted">Email:</dt>
                <dd className="text-fg">{user.email}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="mt-6 rounded-md border border-border-default bg-success-subtle p-4">
          <h2 className="text-sm font-semibold text-success">Profile linkage (Drizzle example)</h2>
          <p className="mt-1 text-sm text-success">
            To fetch user-owned data, use <code className="rounded bg-surface px-1">user.id</code>{" "}
            from the validated session as the filter — never trust a client-sent id.
          </p>
          <pre className="mt-3 overflow-x-auto rounded bg-surface p-3 text-xs text-fg">
            {`// Drizzle: filter by owner_user_id from validated session
// RLS additionally enforces auth.uid() = owner_user_id as safety net
await db.select().from(profiles)
  .where(eq(profiles.owner_user_id, user.id));`}
          </pre>
          <p className="mt-2 text-xs text-success">
            See <Link href="/profile" className="font-medium underline">/profile</Link> for the dedicated profile demo.
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href="/profile"
            className="rounded-md border border-border-control px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-tint"
          >
            View profile
          </Link>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
