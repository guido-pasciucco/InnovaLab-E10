import { NumoraLogo } from "@/components/brand/numora-logo";

type AuthHeroPanelProps = {
  badge?: string;
  title: string;
  description: string;
  benefits: readonly string[];
  benefitsLabel: string;
  footnote?: string;
};

// Shared left panel for the auth screens: logo, badge, title,
// description and benefit chips. The copy comes from each page so signup
// and login keep their own voice without duplicating the layout.
export function AuthHeroPanel({
  badge,
  title,
  description,
  benefits,
  benefitsLabel,
  footnote,
}: AuthHeroPanelProps) {
  return (
    <section className="w-full max-w-md">
      <div className="flex items-center justify-between gap-4">
        <div className="h-7 w-36 shrink-0 sm:h-8 sm:w-40 lg:h-9 lg:w-44">
          <NumoraLogo variant="light" />
        </div>
        {badge && (
          <span className="rounded-full border border-border-default bg-surface/70 px-2 py-1 text-[10px] font-medium text-fg-muted lg:text-[13px]">
            {badge}
          </span>
        )}
      </div>

      <h1 className="mt-6 max-w-xs text-2xl font-bold leading-tight tracking-tight text-fg sm:text-3xl lg:max-w-md lg:text-[34px]">
        {title}
      </h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-fg-muted lg:text-base">{description}</p>

      <ul className="mt-5 flex flex-wrap gap-2" aria-label={benefitsLabel}>
        {benefits.map((benefit) => (
          <li
            key={benefit}
            className="flex items-center gap-1.5 rounded-full bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-fg-muted shadow-sm lg:gap-2 lg:px-3 lg:py-1.5 lg:text-sm"
          >
            <span aria-hidden="true" className="text-link">
              ✓
            </span>
            {benefit}
          </li>
        ))}
      </ul>

      {footnote && (
        <p className="mt-5 flex max-w-sm items-start gap-2 text-[11px] leading-relaxed text-fg-muted lg:text-sm">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mt-0.5 size-4 shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5" />
            <path d="M12 8h.01" />
          </svg>
          <span>{footnote}</span>
        </p>
      )}
    </section>
  );
}
