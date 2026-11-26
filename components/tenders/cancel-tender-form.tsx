"use client";

import { Button } from "@/components/ui/button";

import { useState } from "react";

import { cancelTender } from "@/app/(business)/licitaciones/actions";
import { useFormDataAction } from "@/components/forms/use-form-data-action";
import { FormBanner } from "@/components/ui/page-shell";

// RN-03: a published tender can only be cancelled before it closes. Two steps
// so a stray click does not cancel it.
export function CancelTenderForm({ tenderId, label = "Cancelar licitación" }: { tenderId: string; label?: string }) {
  const { pending, onSubmit, formError } = useFormDataAction<unknown>(cancelTender);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="danger" size="md"
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-11! rounded-[14px]! px-5! text-sm! font-semibold! text-danger! hover:bg-danger-subtle! focus-visible:outline-2! focus-visible:outline-focus!"
      >
        {label}
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="tenderId" value={tenderId} />
      <p className="text-sm text-fg">
        ¿Cancelar la licitación? Los proveedores ya no van a poder ofertar y no se puede deshacer. Para pedir precios
        otra vez, publicás una nueva.
      </p>
      <div className="flex gap-2">
        <Button variant="danger" size="md"
          type="submit"
          disabled={pending}
          className="min-h-11! rounded-[14px]! bg-danger! px-5! text-sm! font-semibold! text-white! disabled:opacity-60!"
        >
          {pending ? "Cancelando…" : "Sí, cancelar"}
        </Button>
        <Button variant="ghost" size="md"
          type="button"
          onClick={() => setConfirming(false)}
          className="min-h-11! rounded-[14px]! px-5! text-sm! font-semibold! text-fg! hover:bg-surface-tint!"
        >
          No
        </Button>
      </div>
      <FormBanner message={formError} />
    </form>
  );
}
