import type { ComponentPropsWithRef, ReactNode } from "react";

// Shared by every text-like field (TextField, PasswordInput).
export function fieldInputClassName(hasError: boolean, paddingClassName: string): string {
  return `h-10 w-full rounded-md border bg-surface ${paddingClassName} text-sm text-fg outline-none transition placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-accent-glow disabled:cursor-not-allowed disabled:bg-surface-disabled lg:h-[42px] lg:text-base ${
    hasError ? "border-danger" : "border-border-control"
  }`;
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-fg-muted lg:text-sm">
      {children}
    </label>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="text-xs text-danger lg:text-sm">
      {children}
    </p>
  );
}

export function LeadingIcon({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-fg-muted"
    >
      {children}
    </span>
  );
}

type TextFieldProps = Omit<ComponentPropsWithRef<"input">, "className"> & {
  id: string;
  label: string;
  error?: string;
  icon?: ReactNode;
};

export function TextField({ label, error, icon, id, ...props }: TextFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        {icon && <LeadingIcon>{icon}</LeadingIcon>}
        <input
          {...props}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={fieldInputClassName(Boolean(error), icon ? "pl-10 pr-3" : "px-3")}
        />
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
