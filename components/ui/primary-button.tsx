import type { ComponentPropsWithRef } from "react";

export type PrimaryButtonProps = ComponentPropsWithRef<"button">;

export function PrimaryButton({
  type = "button",
  className = "",
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`min-h-11 w-full rounded-[14px] bg-action-primary px-4 py-2 text-base font-semibold text-on-action-primary hover:bg-action-primary-hover active:bg-action-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:bg-action-disabled disabled:text-fg-disabled ${className}`}
    />
  );
}
