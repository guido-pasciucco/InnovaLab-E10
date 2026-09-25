import Link from "next/link";

const authViews = [
  { href: "/login", label: "Log in", description: "Sign in with email and password." },
  { href: "/signup", label: "Sign up", description: "Create a new account." },
  { href: "/dashboard", label: "Dashboard", description: "Protected page; reads the session server-side." },
  { href: "/profile", label: "Profile", description: "auth.users id linked to app data." },
  { href: "/reset-password", label: "Reset password", description: "Request a recovery email." },
  { href: "/update-password", label: "Update password", description: "Set a new password from a recovery link." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-10 px-8 py-16">
        <header className="flex flex-col gap-2 text-center sm:text-left">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Supabase Auth demo
          </h1>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Mediated topology: the browser only talks to <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">/api/*</code>;
            Supabase stays on the server.
          </p>
        </header>

        <nav aria-label="Auth views" className="grid gap-4 sm:grid-cols-2">
          {authViews.map((view) => (
            <Link
              key={view.href}
              href={view.href}
              className="flex flex-col gap-1 rounded-xl border border-black/[.08] bg-white p-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:bg-black dark:hover:bg-[#1a1a1a]"
            >
              <span className="font-medium text-black dark:text-zinc-50">{view.label}</span>
              <span className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {view.description}
              </span>
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
