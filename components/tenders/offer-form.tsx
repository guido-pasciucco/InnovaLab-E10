"use client";

import { submitOffers } from "@/app/proveedor/licitaciones/[id]/actions";
import { useFormDataAction } from "@/components/forms/use-form-data-action";
import { FormBanner } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { formatMoney, formatQuantity } from "./format";

type OfferItem = {
  id: string;
  supplyName: string;
  unit: string;
  quantity: string;
  startingPrice: string;
  currentTarget: string | null;
  myLastPrice: string | null;
};

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-border-control bg-surface px-3 py-2 text-base text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-invalid:border-danger";

// The supplier's offer for the round in force (RN-10, RN-20): one price per
// item, blank for items it does not quote. Not answering keeps the last offer.
export function OfferForm({ tenderId, round, items }: { tenderId: string; round: number; items: OfferItem[] }) {
  const { state, pending, onSubmit, fieldErrors, formError } = useFormDataAction(submitOffers);
  const saved = state?.ok ? state.data : null;

  // Zod rejects a malformed price as `offers.<index>.unitPrice`, a key this
  // form does not render as an input. Those messages used to leave both the
  // banner and every row empty, so the supplier saw nothing at all. Business
  // errors are already keyed `price-<itemId>` and stay under their input.
  const visibleFields = new Set(items.map((item) => `price-${item.id}`));
  const detachedErrors = Object.entries(fieldErrors)
    .filter(([name]) => !visibleFields.has(name))
    .map(([, message]) => message);
  const detachedError = detachedErrors.length ? [...new Set(detachedErrors)].join(" ") : null;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="tenderId" value={tenderId} />
      <ul className="divide-y divide-border-default">
        {items.map((item) => {
          const error = fieldErrors[`price-${item.id}`];
          const limit = item.myLastPrice ?? item.startingPrice;
          return (
            <li key={item.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_14rem] sm:items-start">
              <div className="text-sm">
                <p className="font-semibold text-fg">
                  {item.supplyName} · {formatQuantity(item.quantity)} {item.unit}
                </p>
                <p className="text-fg-muted">
                  {item.myLastPrice ? `Tu oferta vigente: ${formatMoney(item.myLastPrice)}` : "Todavía no ofertaste"}
                  {" · "}máximo {formatMoney(limit)}
                  {item.currentTarget && ` · objetivo de la ronda: ${formatMoney(item.currentTarget)}`}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`price-${item.id}`} className="text-sm font-semibold text-fg">
                  Precio por {item.unit}
                </label>
                <input
                  id={`price-${item.id}`}
                  name={`price-${item.id}`}
                  inputMode="decimal"
                  placeholder={item.myLastPrice ? "Dejalo vacío para mantenerlo" : "Vacío si no cotizás"}
                  className={inputClass}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `price-${item.id}-error` : undefined}
                />
                {error && (
                  <p id={`price-${item.id}-error`} role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <FormBanner message={formError ?? detachedError} />
      <FormBanner
        tone="success"
        message={
          saved ? `Listo: registramos ${saved.count === 1 ? "tu oferta" : `tus ${saved.count} ofertas`} de la ronda ${saved.round}.` : null
        }
      />
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Enviando…" : `Enviar ofertas de la ronda ${round}`}
      </PrimaryButton>
    </form>
  );
}
