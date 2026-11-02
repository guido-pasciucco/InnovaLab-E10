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
          className="flex flex-wrap gap-1 rounded-lg border border-[#d6eadb] bg-white p-1.5 shadow-md"
        >
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              aria-pressed={selected === scenario.id}
              onClick={() => onSelect(selected === scenario.id ? null : scenario.id)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                selected === scenario.id
                  ? "bg-[#168a3d] text-white"
                  : "text-[#31503a] hover:bg-[#eaf7ee]"
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
        className="flex items-center gap-1.5 rounded-full border border-[#d6eadb] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#31503a] shadow-md transition hover:border-[#3ad85c]"
      >
        <span
          aria-hidden="true"
          className={`size-2 rounded-full ${open ? "bg-red-500" : "bg-[#3ad85c]"}`}
        />
        {open ? "Ocultar errores (demo)" : "Mostrar errores (demo)"}
      </button>
    </div>
  );
}
