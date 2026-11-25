"use client";import { Button } from "@/components/ui/button";


import { acknowledgeNoOfferWarning } from "@/app/(business)/licitaciones/actions";
import { useFormDataAction } from "@/components/forms/use-form-data-action";
import { FormBanner } from "@/components/ui/page-shell";

// RN-18: once round 1 is over, the emprendedor learns which items got no
// offer and can acknowledge the notice (doing nothing has the same effect).
// Cancelling is a separate, confirmed action in the tender's general actions,
// not a second choice inside this warning. Suppliers and items are unchanged.
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
        Podés dejar que la licitación siga; es lo que pasa si no hacés nada. No se pueden sumar proveedores ni quitar
        insumos. Si querés cancelarla, hacelo desde las acciones generales de la licitación.
      </p>
      <form onSubmit={onSubmit}>
        <input type="hidden" name="tenderId" value={tenderId} />
        <Button variant="primary" size="md"
          type="submit"
          disabled={pending}
          className="min-h-11! rounded-[14px]! bg-action-primary! px-5! text-sm! font-semibold! text-on-action-primary! hover:bg-action-primary-hover! disabled:opacity-60!"
        >
          {pending ? "Guardando…" : "Dejar que siga"}
        </Button>
      </form>
      <FormBanner message={formError} />
    </section>
  );
}
