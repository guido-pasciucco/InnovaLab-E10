"use client";import { Button } from "@/components/ui/button";


import { useEffect, useId, useRef, type ReactNode } from "react";

type CatalogModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg";
  // Optional context under the title (#288). It is not part of the accessible
  // name, so existing dialog queries keep working for the other catalogs.
  description?: string;
};

const SIZE_CLASS = {
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input:not([type="hidden"]), select, [tabindex]:not([tabindex="-1"])';

// Accessible dialog shared by both catalogs (Insumos and Productos). It closes on
// Escape, backdrop click and the close button, locks background scrolling and
// traps/restores focus while open.
export function CatalogModal({
  title,
  onClose,
  children,
  size = "md",
  description,
}: CatalogModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    triggerRef.current = (document.activeElement as HTMLElement | null) ?? null;
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusables = (): HTMLElement[] => {
      const root = dialogRef.current;
      if (!root) return [];
      return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute("disabled"),
      );
    };

    // Move focus to the first field of the content once it is mounted.
    const focusTimer = window.setTimeout(() => {
      const contentFocusables = contentRef.current
        ? Array.from(
            contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
          ).filter((el) => !el.hasAttribute("disabled"))
        : [];
      if (contentFocusables.length > 0) contentFocusables[0].focus();
      else {
        const all = getFocusables();
        if (all.length > 0) all[0].focus();
        else closeRef.current?.focus();
      }
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = getFocusables();
      if (focusables.length === 0) {
        event.preventDefault();
        closeRef.current?.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || active === closeRef.current) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the element that opened the modal, but only if it is
      // still mounted and enabled; otherwise leave focus where it is.
      const trigger = triggerRef.current;
      if (
        trigger &&
        typeof trigger.focus === "function" &&
        trigger.isConnected &&
        !trigger.hasAttribute("disabled")
      ) {
        trigger.focus();
      }
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-[24px] bg-surface p-5 shadow-xl ${SIZE_CLASS[size]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-default pb-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-semibold tracking-tight text-fg">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-fg-muted">{description}</p>
            )}
          </div>
          <Button variant="ghost" size="sm"
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="min-h-9! min-w-9! shrink-0! rounded-[10px]! border! border-border-control! text-lg! font-semibold! text-fg-muted! hover:bg-surface-tint! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus!"
          >
            ×
          </Button>
        </div>

        <div ref={contentRef} className="mt-4">{children}</div>
      </div>
    </div>
  );
}
