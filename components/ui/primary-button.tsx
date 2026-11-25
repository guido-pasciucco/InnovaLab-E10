import type { ComponentPropsWithRef } from "react";

import { Button } from "./button";

export type PrimaryButtonProps = ComponentPropsWithRef<"button">;

/**
 * @deprecated Use `Button` with `variant="primary"` instead.
 * Kept as an alias so existing forms keep their full-width layout.
 */
export function PrimaryButton({
  className = "",
  ...props
}: PrimaryButtonProps) {
  return <Button {...props} variant="primary" className={`w-full ${className}`} />;
}
