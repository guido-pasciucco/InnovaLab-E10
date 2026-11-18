"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type SuppliesModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

// Accessible dialog used by the catalog for both create and edit. It closes on
// Escape, backdrop click and the close button, and locks background scrolling
// while open. Kept as a client component so the form stays mounted only while
// the modal is visible.
export function SuppliesModal({ title, onClose, children }: SuppliesModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-surface p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-fg">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="min-h-9 min-w-9 rounded-[10px] border border-border-control text-lg font-semibold text-fg-muted hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            ×
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
