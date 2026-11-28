"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { closeCalculation } from "@/app/(business)/equilibrio/actions";
import { Button } from "@/components/ui/button";
import { CatalogModal } from "@/components/ui/catalog-modal";

type CloseCalculationButtonProps = {
  label: string;
  confirmation: string;
};

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
      <Button className="px-5 text-sm" onClick={() => setOpen(true)} disabled={pending}>
        {pending ? "Guardando…" : label}
      </Button>
      {error && (
        <p role="alert" className="rounded-md bg-danger-subtle p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {open && (
        <CatalogModal title="Cerrar cálculo" onClose={() => setOpen(false)}>
          <p className="text-sm text-fg">{confirmation}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="px-5 text-sm text-fg hover:bg-surface-tint"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button className="px-5 text-sm" onClick={close}>
              Confirmar cierre
            </Button>
          </div>
        </CatalogModal>
      )}
    </div>
  );
}
