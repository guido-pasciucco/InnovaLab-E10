"use client";

import { useState } from "react";

// Dev-only error preview control (same mechanism as the signup screen, #186).
// NODE_ENV is statically replaced by Next at build time, so a production
// build never renders the control: no QA buttons ship to users.
export const SHOW_ERROR_PREVIEW = process.env.NODE_ENV === "development";

export type PreviewScenario = {
  id: string;
  label: string;
};

type ErrorPreviewControlProps = {
  scenarios: readonly PreviewScenario[];
  selected: string | null;
  onSelect: (id: string | null) => void;
};

export function ErrorPreviewControl({ scenarios, selected, onSelect }: ErrorPreviewControlProps) {
  const [open, setOpen] = useState(false);

  if (!SHOW_ERROR_PREVIEW) return null;

  const toggle = () => {
    // Closing the panel restores the normal form.
    if (open) onSelect(null);
    setOpen((visible) => !visible);
  };

  return (
    <div className="fixed bottom-3 left-3 z-40 flex max-w-[calc(100vw-1.5rem)] flex-col items-start gap-1.5 sm:left-auto sm:right-3">
      {open && (
        <div
          id="error-preview-scenarios"
          role="group"
          aria-label="Escenarios de error (demo)"
          className="flex flex-wrap gap-1 rounded-lg border border-border-default bg-surface p-1.5 shadow-md"
        >
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              aria-pressed={selected === scenario.id}
              onClick={() => onSelect(selected === scenario.id ? null : scenario.id)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                selected === scenario.id
                  ? "bg-action-primary text-on-action-primary"
                  : "text-fg-muted hover:bg-action-tonal"
              }`}
            >
              {scenario.label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={open}
        aria-expanded={open}
        aria-controls="error-preview-scenarios"
        className="flex items-center gap-1.5 rounded-full border border-border-default bg-surface px-3 py-1.5 text-[11px] font-semibold text-fg-muted shadow-md transition hover:border-accent-glow"
      >
        <span
          aria-hidden="true"
          className={`size-2 rounded-full ${open ? "bg-danger" : "bg-accent-glow"}`}
        />
        {open ? "Ocultar errores (demo)" : "Mostrar errores (demo)"}
      </button>
    </div>
  );
}
