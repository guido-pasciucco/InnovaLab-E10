"use client";

import { useId, type ComponentPropsWithRef } from "react";

export type TextFieldProps = ComponentPropsWithRef<"input"> & {
  label: string;
  error?: string;
};

export function TextField({
  label,
  error,
  id,
  className = "",
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={inputId} className="text-base font-semibold text-fg">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
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
