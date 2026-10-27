import type { ComponentPropsWithRef } from "react";

export type PrimaryButtonProps = ComponentPropsWithRef<"button">;

// #170 owns the green tokens. Until they exist, retain the current blue palette.
export function PrimaryButton({ type = "button", className = "", ...props }: PrimaryButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`w-full rounded-md bg-[var(--brand-green-600,var(--color-blue-600))] px-4 py-2 font-medium text-white hover:bg-[var(--brand-green-700,var(--color-blue-700))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green-600,var(--color-blue-600))] disabled:bg-[var(--brand-green-100,var(--color-blue-300))] ${className}`}
    />
  );
}
