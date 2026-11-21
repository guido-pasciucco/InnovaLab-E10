import Link from "next/link";
import type { ReactNode } from "react";

type PageLink = { href: string; label: string };

type PageShellProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  links?: PageLink[];
  actions?: ReactNode;
  children: ReactNode;
};

const linkClass =
  "inline-flex min-h-11 items-center justify-center rounded-[14px] px-5 py-2 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// Page frame shared by the supplier and tender screens: same header and
// spacing as the dashboard and the supply catalog.
export function PageShell({ eyebrow, title, description, links = [], actions, children }: PageShellProps) {
  return (
    <main className="min-h-screen bg-surface-tint px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {eyebrow && (
              <p className="text-sm font-semibold tracking-wide text-brand-green-700 uppercase">{eyebrow}</p>
            )}
            <h1 className="mt-1 text-3xl font-bold text-fg sm:text-4xl">{title}</h1>
            {description && <div className="mt-2 max-w-xl text-base text-fg-muted">{description}</div>}
          </div>
          {(links.length > 0 || actions) && (
            <nav aria-label="Navegación de la sección" className="flex flex-col gap-3 self-start sm:flex-row sm:items-center">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              ))}
              {actions}
            </nav>
          )}
        </header>
        {children}
      </div>
    </main>
  );
}

// White card used for each block of content.
export function Card({ title, children, id }: { title?: string; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={title && id ? id : undefined} className="space-y-4 rounded-3xl bg-surface p-5 shadow-sm sm:p-6">
      {title && (
        <h2 id={id} className="text-lg font-bold text-fg">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function FormBanner({ message, tone = "danger" }: { message: string | null; tone?: "danger" | "success" }) {
  if (!message) return null;
  const toneClass = tone === "danger" ? "bg-danger-subtle text-danger" : "bg-success-subtle text-success";
  return (
    <p role={tone === "danger" ? "alert" : "status"} className={`rounded-md p-3 text-sm ${toneClass}`}>
      {message}
    </p>
  );
}
