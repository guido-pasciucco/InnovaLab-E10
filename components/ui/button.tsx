import type { ComponentPropsWithRef } from "react";

export type ButtonVariant = "primary" | "outline" | "danger" | "ghost";
export type ButtonSize = "md" | "sm";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type ButtonClassNameOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

// Shared button styles. `buttonClassName` is exported so non-button elements
// that must look like an action (e.g. a Link in a table row) stay in sync.
const BASE_CLASS =
  "inline-flex cursor-pointer items-center justify-center gap-2 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-action-primary text-on-action-primary hover:bg-action-primary-hover active:bg-action-primary-pressed disabled:bg-action-disabled disabled:text-fg-disabled",
  outline:
    "border border-border-control text-brand-green-700 hover:bg-brand-green-50 disabled:opacity-50",
  danger:
    "border border-border-control text-danger hover:bg-danger/5 disabled:opacity-50",
  ghost: "text-fg hover:bg-surface-tint disabled:opacity-50",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "min-h-11 rounded-[14px] px-4 py-2 text-base",
  sm: "min-h-9 rounded-[10px] px-2 py-1 text-sm",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className = "",
}: ButtonClassNameOptions = {}): string {
  return [BASE_CLASS, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={buttonClassName({ variant, size, className })}
    />
  );
}
