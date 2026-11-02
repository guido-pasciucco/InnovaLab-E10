type AuthHeroPanelProps = {
  badge: string;
  title: string;
  description: string;
  benefits: readonly string[];
  benefitsLabel: string;
  brand?: string;
  footnote?: string;
};

function CalculatorMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`grid grid-cols-2 gap-0.5 rounded-[5px] bg-[#168a3d] p-1 ${className}`}>
      <span className="size-1.5 rounded-[1px] bg-white" />
      <span className="size-1.5 rounded-[1px] bg-white" />
      <span className="size-1.5 rounded-[1px] bg-white" />
      <span className="size-1.5 rounded-[1px] bg-white" />
    </span>
  );
}

// Shared left panel for the auth screens: logo, badge, icon, title,
// description and benefit chips. The copy comes from each page so signup
// and login keep their own voice without duplicating the layout.
export function AuthHeroPanel({
  badge,
  title,
  description,
  benefits,
  benefitsLabel,
  brand = "Calculadora",
  footnote,
}: AuthHeroPanelProps) {
  return (
    <section className="max-w-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#136831] lg:text-sm">
          <CalculatorMark className="lg:scale-125" />
          <span>{brand}</span>
        </div>
        <span className="rounded-full border border-[#9edeb4] bg-white/70 px-2 py-1 text-[10px] font-medium text-[#39714b] lg:text-[13px]">
          {badge}
        </span>
      </div>

      <div className="mt-5 flex size-8 items-center justify-center rounded-lg bg-[#168a3d] shadow-sm lg:size-11">
        <CalculatorMark className="scale-75" />
      </div>

      <h1 className="mt-4 max-w-xs text-2xl font-bold leading-tight tracking-tight text-[#12321e] sm:text-3xl lg:max-w-md lg:text-[34px]">
        {title}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#497154] lg:text-base">{description}</p>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label={benefitsLabel}>
        {benefits.map((benefit) => (
          <li
            key={benefit}
            className="flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#326842] shadow-sm lg:gap-2 lg:px-3 lg:py-1.5 lg:text-sm"
          >
            <span aria-hidden="true" className="text-[#168a3d]">
              ✓
            </span>
            {benefit}
          </li>
        ))}
      </ul>

      {footnote && (
        <p className="mt-4 flex max-w-sm items-start gap-2 text-[11px] leading-relaxed text-[#497154] lg:text-sm">
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
