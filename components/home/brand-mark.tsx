import Link from "next/link";

import { NumoraLogo } from "@/components/brand/numora-logo";

type BrandMarkProps = {
  tone?: "dark" | "light";
};

export function BrandMark({ tone = "dark" }: BrandMarkProps) {
  const logoVariant = tone === "light" ? "dark" : "light";

  return (
    <Link
      href="/"
      aria-label="Numora, ir al inicio"
      className="inline-flex h-12 w-56 shrink-0 items-center overflow-hidden rounded-lg sm:h-14 sm:w-64 lg:h-16 lg:w-72 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
    >
      <NumoraLogo variant={logoVariant} />
    </Link>
  );
}
