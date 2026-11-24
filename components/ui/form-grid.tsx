import type { ComponentPropsWithRef } from "react";

export type FormGridProps = ComponentPropsWithRef<"div"> & {
  // Optional: one column on mobile, two from sm up. The default keeps the
  // two-column behaviour used by the supplies catalog (#288 QA).
  stackOnMobile?: boolean;
};

export function FormGrid({
  className = "",
  stackOnMobile = false,
  ...props
}: FormGridProps) {
  const columns = stackOnMobile
    ? "grid-cols-1 sm:grid-cols-2"
    : "grid-cols-2";

  return <div {...props} className={`grid ${columns} gap-4 ${className}`} />;
}
