"use client";

import { useId, type ComponentPropsWithRef } from "react";

export type SelectFieldProps = ComponentPropsWithRef<"select"> & {
  label: string;
  error?: string;
};

export function SelectField({
  label,
  error,
  id,
  className = "",
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={selectId} className="text-base font-semibold text-fg">
        {label}
      </label>
      <select
        {...props}
        id={selectId}
        aria-invalid={error ? true : invalid}
        aria-describedby={
          [describedBy, error ? errorId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`min-h-11 w-full rounded-[10px] border border-border-default bg-surface px-4 py-2 text-base text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-invalid:border-danger disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-fg-disabled ${className}`}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
