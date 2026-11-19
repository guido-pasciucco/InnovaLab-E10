"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type CatalogModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  // "md" fits a short form; "lg" is for forms that stack several fieldsets.
  size?: "md" | "lg";
};

const SIZE_CLASS = {
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

// Accessible dialog shared by both catalogs (Insumos and Productos) so create,
// edit and detail views look and behave the same. It closes on Escape, backdrop
// click and the close button, and locks background scrolling while open. Kept as
// a client component so the content stays mounted only while visible.
export function CatalogModal({
  title,
  onClose,
  children,
  size = "md",
}: CatalogModalProps) {
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
        className={`max-h-[90vh] w-full overflow-y-auto rounded-[24px] bg-surface p-5 shadow-xl ${SIZE_CLASS[size]}`}
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
