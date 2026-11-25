import Link from "next/link";
import type { ComponentType } from "react";

import { ArrowRightIcon, SparklesIcon, type IconProps } from "@/components/home/icons";
import { container, primaryButton, secondaryButton } from "@/components/home/styles";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  anchorLabel: string;
  anchorHref: string;
  stats: readonly { value: string; label: string }[];
  icon: ComponentType<IconProps>;
};

export function PageHero({
  eyebrow,
  title,
  highlight,
  description,
  ctaHref,
  ctaLabel,
  anchorLabel,
  anchorHref,
  stats,
  icon: Icon,
}: PageHeroProps) {
  return (
    <section aria-labelledby="page-hero-title" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-canvas/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-action-tonal/70 blur-3xl"
      />

      <div className={`${container} relative grid gap-10 pb-16 pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pb-24 lg:pt-20`}>
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border-default bg-action-tonal px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-link">
            <SparklesIcon className="h-3.5 w-3.5" />
            {eyebrow}
          </p>

          <h1
            id="page-hero-title"
            className="mt-5 max-w-3xl text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-fg sm:text-[2.55rem] lg:text-[2.9rem]"
          >
            {title} <span className="mt-2 block text-link">{highlight}</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-6 text-fg-muted sm:text-[1.0625rem] sm:leading-7">
            {description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={ctaHref} className={primaryButton}>
              {ctaLabel}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <a href={anchorHref} className={secondaryButton}>
              {anchorLabel}
            </a>
          </div>
        </div>

        <div className="rounded-[26px] border border-border-default bg-surface p-6 shadow-[0_28px_80px_-36px_rgba(11,107,79,0.5)] sm:p-7">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-action-tonal text-link">
            <Icon className="h-6 w-6" />
          </span>
          <dl className="mt-6 space-y-5">
            {stats.map((stat) => (
              <div key={stat.value} className="border-b border-border-default pb-4 last:border-0 last:pb-0">
                <dt className="text-sm font-semibold text-fg">{stat.value}</dt>
                <dd className="mt-1 text-xs leading-5 text-fg-muted">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
