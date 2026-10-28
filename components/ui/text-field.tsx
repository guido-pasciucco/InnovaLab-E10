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
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={inputId} className="text-base font-semibold text-gray-900">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        aria-invalid={error ? true : invalid}
        aria-describedby={[describedBy, error ? errorId : undefined].filter(Boolean).join(" ") || undefined}
        className={`min-h-14 w-full rounded-[10px] border border-gray-400 bg-white px-4 py-3 text-lg text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green-600,var(--color-blue-600))] aria-invalid:border-red-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${className}`}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
