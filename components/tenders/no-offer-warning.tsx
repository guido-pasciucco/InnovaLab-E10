"use client";

import { acknowledgeNoOfferWarning } from "@/app/(flujo-1)/licitaciones/actions";
import { useFormDataAction } from "@/components/forms/use-form-data-action";
import { FormBanner } from "@/components/ui/page-shell";
import { CancelTenderForm } from "./cancel-tender-form";

// RN-18: once round 1 is over, the emprendedor learns which items got no
// offer and chooses: let it continue (also what happens by doing nothing) or
// cancel the whole tender. Suppliers cannot be added nor items removed.
export function NoOfferWarning({ tenderId, items }: { tenderId: string; items: string[] }) {
  const { pending, onSubmit, formError } = useFormDataAction<unknown>(acknowledgeNoOfferWarning);

  return (
    <section role="alert" className="space-y-3 rounded-3xl border border-danger/30 bg-danger-subtle p-5 sm:p-6">
      <h2 className="text-lg font-bold text-fg">Insumos sin ofertas en la primera ronda</h2>
      <p className="text-sm text-fg">
        Terminó la primera ronda y {items.length === 1 ? "este insumo no recibió" : "estos insumos no recibieron"}{" "}
        ninguna oferta: <strong>{items.join(", ")}</strong>.
      </p>
      <p className="text-sm text-fg">
        Podés dejar que la licitación siga (es lo que pasa si no hacés nada) o cancelarla entera. No se pueden sumar
        proveedores ni quitar insumos: para eso, cancelala y publicá una nueva.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <form onSubmit={onSubmit}>
          <input type="hidden" name="tenderId" value={tenderId} />
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-[14px] bg-action-primary px-5 text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Dejar que siga"}
          </button>
        </form>
        <CancelTenderForm tenderId={tenderId} label="Cancelar la licitación" />
      </div>
      <FormBanner message={formError} />
    </section>
  );
}
