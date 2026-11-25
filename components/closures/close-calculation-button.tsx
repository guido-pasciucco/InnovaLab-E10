"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { closeCalculation } from "@/app/(business)/equilibrio/actions";
import { CatalogModal } from "@/components/ui/catalog-modal";

type CloseCalculationButtonProps = {
  label: string;
  confirmation: string;
};

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-[14px] bg-action-primary px-5 py-2 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover active:bg-action-primary-pressed disabled:bg-action-disabled focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const secondaryClass =
  "inline-flex min-h-11 items-center justify-center rounded-[14px] border border-border-control px-5 py-2 text-sm font-semibold text-fg hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// The manual closing door (#322). Confirmation is explicit because a closing
// cannot be undone: a correction is a new version of the same month.
export function CloseCalculationButton({ label, confirmation }: CloseCalculationButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await closeCalculation();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" className={buttonClass} onClick={() => setOpen(true)} disabled={pending}>
        {pending ? "Guardando…" : label}
      </button>
      {error && (
        <p role="alert" className="rounded-md bg-danger-subtle p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {open && (
        <CatalogModal title="Cerrar cálculo" onClose={() => setOpen(false)}>
          <p className="text-sm text-fg">{confirmation}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={secondaryClass} onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="button" className={buttonClass} onClick={close}>
              Confirmar cierre
            </button>
          </div>
        </CatalogModal>
      )}
    </div>
  );
}
