"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";
import { useState } from "react";

type PasswordInputProps = ComponentPropsWithRef<"input"> & {
  label: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
};

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9.4 5.1 9.9 7.8a12.3 12.3 0 0 1-3.1 4.9M6.6 6.6C4.6 8.2 2.5 10.6 2.1 11.8 2.6 14.5 6.5 19.6 12 19.6c.8 0 1.6-.1 2.3-.3" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
      <path d="M2.1 12S5.7 5.5 12 5.5 21.9 12 21.9 12 18.3 18.5 12 18.5 2.1 12 2.1 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

export function PasswordInput({
  label,
  error,
  hint,
  icon,
  id,
  autoComplete,
  disabled,
  ...props
}: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-[#31503a] lg:text-sm">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-[#6a806f]"
          >
            {icon}
          </span>
        )}
        <input
          {...props}
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`h-10 w-full rounded-md border bg-white ${icon ? "pl-10" : "pl-3"} pr-10 text-sm text-[#17351f] outline-none transition placeholder:text-[#9ba9a0] focus-visible:ring-2 focus-visible:ring-[#3ad85c] disabled:cursor-not-allowed disabled:bg-slate-100 lg:h-[42px] lg:text-base ${error ? "border-red-500" : "border-[#b7c9bb]"}`}
        />
        <button
          type="button"
          onClick={() => setShow((visible) => !visible)}
          aria-pressed={show}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-[#6a806f] hover:text-[#174425] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#3ad85c]"
        >
          <EyeIcon visible={show} />
        </button>
      </div>
      {hint && (
        <p id={hintId} className="text-[10px] text-[#6a806f] lg:text-[13px]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 lg:text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
