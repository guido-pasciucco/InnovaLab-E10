import type { ReactNode } from "react";

type AuthPageShellProps = {
  hero: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
};

// Shared page frame for the auth screens: the hero slot on the left and the
// form card on the right. The global background is painted by the root
// layout, so <main> stays transparent (a second gradient or extra min-height
// here would add a phantom scroll).
export function AuthPageShell({ hero, title, subtitle, children }: AuthPageShellProps) {
  return (
    <main className="min-h-screen overflow-hidden px-4 py-6 text-[#12321e] sm:px-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[64rem] items-center gap-8 sm:min-h-[calc(100vh-5rem)] lg:grid-cols-[minmax(0,1fr)_25.25rem] lg:gap-10">
        {hero}

        <section className="w-full rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_16px_36px_rgba(24,105,52,0.15)] sm:p-6 lg:p-7">
          <h2 className="text-xl font-bold tracking-tight text-[#12321e] lg:text-[24px]">{title}</h2>
          <p className="mt-1 text-xs text-[#5c7563] lg:text-base">{subtitle}</p>
          <div className="mt-4">{children}</div>
        </section>
      </div>
    </main>
  );
}
