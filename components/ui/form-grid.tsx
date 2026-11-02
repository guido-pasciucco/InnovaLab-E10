import type { ComponentPropsWithRef } from "react";

export type FormGridProps = ComponentPropsWithRef<"div">;

export function FormGrid({ className = "", ...props }: FormGridProps) {
  return <div {...props} className={`grid grid-cols-2 gap-4 ${className}`} />;
}
