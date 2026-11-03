import Link from "next/link";
import type { ReactNode } from "react";

type AuthPageShellProps = {
  hero: ReactNode;
  title: string;
  subtitle: ReactNode;
  icon?: ReactNode;
  centered?: boolean;
  showHomeLink?: boolean;
  children: ReactNode;
};

// Shared page frame for the auth screens: the hero slot on the left and the
// form card on the right. The global background is painted by the root
// layout, so <main> stays transparent (a second gradient or extra min-height
// here would add a phantom scroll).
export function AuthPageShell({ hero, title, subtitle, icon, centered = false, showHomeLink = false, children }: AuthPageShellProps) {
  return (
    <main className="min-h-screen overflow-hidden px-4 py-6 text-fg sm:px-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[64rem] items-center gap-8 sm:min-h-[calc(100vh-5rem)] lg:grid-cols-[minmax(0,1fr)_25.25rem] lg:gap-10">
        {hero}

        <section className="w-full rounded-2xl border border-surface/80 bg-surface/95 p-5 shadow-[0_16px_36px_rgba(24,105,52,0.15)] sm:p-6 lg:p-7">
          {showHomeLink && (
            <Link
              href="/"
              className="-ml-2 mb-3 inline-flex min-h-11 items-center rounded-[14px] px-2 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              ← Volver al inicio
            </Link>
          )}
          {icon && <div className="mb-3 flex justify-center">{icon}</div>}
          <h2 className={`text-xl font-bold tracking-tight text-fg lg:text-[24px] ${centered ? "text-center" : ""}`}>{title}</h2>
          <p className={`mt-1 text-xs text-fg-muted lg:text-base ${centered ? "text-center" : ""}`}>{subtitle}</p>
          <div className="mt-4">{children}</div>
        </section>
      </div>
    </main>
  );
}
