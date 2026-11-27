"use client";

import { Button } from "@/components/ui/button";

import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from "react";

import { discardTenderDraft, publishTender, saveTenderDraft } from "@/app/(business)/licitaciones/actions";
import { FormBanner } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { targetPrices } from "@/lib/calc/tenderRounds";
import {
  DEFAULT_ROUND_COUNT,
  DEFAULT_ROUND_HOURS,
  MAX_ROUND_COUNT,
  MIN_ROUND_COUNT,
  ROUND_HOURS_OPTIONS,
} from "@/lib/schemas/tenders/fields";
import {
  publishFormErrors,
  type PublishTenderFormValues,
  type TenderDraftFormValues,
} from "@/lib/schemas/tenders/publish";
import { formatMoney } from "./format";

type FormSupply = { id: string; name: string; unit: string; suggestedPrice: string };
type ItemDraft = { quantity: string; specs: string; startingPrice: string };

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-border-control bg-surface px-3 py-2 text-base text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-invalid:border-danger";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  );
}

const secondaryButtonClass =
  "min-h-11! rounded-[14px]! px-5! text-base! font-semibold! text-brand-green-700! hover:bg-brand-green-50! focus-visible:outline-2! focus-visible:outline-focus! disabled:opacity-60!";

// Publish form (RN-02). Supplies are picked from the catalog with the
// starting price prefilled from it. There is no supplier selection: every
// registered supplier may participate (#309). The form can be saved as a
// draft at any time and reopens from it. `publishBlocked` explains why it
// cannot be published yet, if so.
export function PublishTenderForm({
  supplies,
  draft,
  publishBlocked,
}: {
  supplies: FormSupply[];
  draft: TenderDraftFormValues | null;
  publishBlocked: ReactNode;
}) {
  const [state, dispatch, pending] = useActionState(publishTender, undefined);
  const [draftState, saveDraft, savingDraft] = useActionState(saveTenderDraft, undefined);
  const [discardState, discard, discarding] = useActionState(discardTenderDraft, undefined);
  const [roundHours, setRoundHours] = useState<string>(draft?.roundHours || String(DEFAULT_ROUND_HOURS));
  const [roundCount, setRoundCount] = useState<string>(draft?.roundCount || String(DEFAULT_ROUND_COUNT));
  const [decrementPercent, setDecrementPercent] = useState(draft?.decrementPercent ?? "");
  const [selected, setSelected] = useState<string[]>(draft?.items.map((item) => item.supplyId) ?? []);
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>(
    Object.fromEntries(
      (draft?.items ?? []).map(({ supplyId, quantity, specs, startingPrice }) => [
        supplyId,
        { quantity, specs, startingPrice },
      ]),
    ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedSupplies = supplies.filter((supply) => selected.includes(supply.id));

  function toggleSupply(supply: FormSupply) {
    setSelected((current) =>
      current.includes(supply.id) ? current.filter((id) => id !== supply.id) : [...current, supply.id],
    );
    setDrafts((current) =>
      current[supply.id]
        ? current
        : { ...current, [supply.id]: { quantity: "", specs: "", startingPrice: supply.suggestedPrice } },
    );
  }

  function updateDraft(id: string, field: keyof ItemDraft, value: string) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  }

  function previewTargets(startingPrice: string): string[] | null {
    const price = startingPrice.trim().replace(",", ".");
    const percent = decrementPercent.trim().replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(price) || !/^\d{1,2}(\.\d{1,2})?$/.test(percent) || Number(percent) <= 0) return null;
    return targetPrices(price, percent, Number(roundCount));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Items follow the catalog order, so item errors map to the visible rows.
    const payload: PublishTenderFormValues = {
      roundHours,
      roundCount,
      decrementPercent,
      items: selectedSupplies.map((supply) => ({ supplyId: supply.id, ...drafts[supply.id] })),
    };
    const found = publishFormErrors(payload);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    startTransition(() => dispatch(payload));
  }

  function onSaveDraft() {
    const payload: TenderDraftFormValues = {
      roundHours,
      roundCount,
      decrementPercent,
      items: selectedSupplies.map((supply) => ({ supplyId: supply.id, ...drafts[supply.id] })),
    };
    setErrors({});
    startTransition(() => saveDraft(payload));
  }

  const serverError =
    (state && !state.ok ? state.message : null) ??
    (draftState && !draftState.ok ? draftState.message : null) ??
    (discardState && !discardState.ok ? discardState.message : null);
  const draftSaved = draftState?.ok ? "Borrador guardado. Podés seguir cuando quieras desde Licitaciones." : null;
  const totalHours = Number(roundHours) * Number(roundCount);

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <section className="space-y-4 rounded-3xl bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="rondas">
        <h2 id="rondas" className="text-lg font-bold text-fg">
          Rondas
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-base font-semibold text-fg">
            Duración de cada ronda
            <select className={inputClass} value={roundHours} onChange={(e) => setRoundHours(e.target.value)}>
              {ROUND_HOURS_OPTIONS.map((hours) => (
                <option key={hours} value={hours}>
                  {hours} horas
                </option>
              ))}
            </select>
            <FieldError message={errors.roundHours} />
          </label>
          <label className="flex flex-col gap-1 text-base font-semibold text-fg">
            Cantidad de rondas
            <select className={inputClass} value={roundCount} onChange={(e) => setRoundCount(e.target.value)}>
              {Array.from({ length: MAX_ROUND_COUNT - MIN_ROUND_COUNT + 1 }, (_, i) => MIN_ROUND_COUNT + i).map((n) => (
                <option key={n} value={n}>
                  {n} rondas
                </option>
              ))}
            </select>
            <FieldError message={errors.roundCount} />
          </label>
          <label className="flex flex-col gap-1 text-base font-semibold text-fg">
            % de baja por ronda
            <input
              className={inputClass}
              inputMode="decimal"
              placeholder="Ej: 10"
              value={decrementPercent}
              aria-invalid={errors.decrementPercent ? true : undefined}
              onChange={(e) => setDecrementPercent(e.target.value)}
            />
            <FieldError message={errors.decrementPercent} />
          </label>
        </div>
        <p className="text-sm text-fg-muted">
          La licitación dura {totalHours} horas desde que la publicás y cierra sola. En cada ronda el precio objetivo
          baja ese porcentaje: es una referencia para los proveedores, no una obligación.
        </p>
      </section>

      <section className="space-y-4 rounded-3xl bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="insumos">
        <h2 id="insumos" className="text-lg font-bold text-fg">
          Insumos
        </h2>
        <p className="text-sm text-fg-muted">
          Los precios son finales, puestos en tu local (con impuestos y flete), por unidad. El precio de partida es el
          máximo que aceptás y <strong>lo ven los proveedores</strong>: si dejás el de tu catálogo, van a saber cuánto
          pagás hoy.
        </p>
        <FieldError message={errors.items} />
        <ul className="divide-y divide-border-default">
          {supplies.map((supply) => {
            const index = selectedSupplies.findIndex((s) => s.id === supply.id);
            const draft = drafts[supply.id];
            const targets = draft ? previewTargets(draft.startingPrice) : null;
            return (
              <li key={supply.id} className="space-y-3 py-3">
                <label className="flex items-center gap-2 text-base font-semibold text-fg">
                  <input type="checkbox" className="size-4" checked={index >= 0} onChange={() => toggleSupply(supply)} />
                  {supply.name}
                  <span className="text-sm font-normal text-fg-muted">
                    · catálogo: {formatMoney(supply.suggestedPrice)} por {supply.unit}
                  </span>
                </label>
                {index >= 0 && draft && (
                  <div className="grid gap-3 pl-6 sm:grid-cols-3">
                    <label className="flex flex-col gap-1 text-sm font-semibold text-fg">
                      Cantidad ({supply.unit})
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        value={draft.quantity}
                        aria-invalid={errors[`items.${index}.quantity`] ? true : undefined}
                        onChange={(e) => updateDraft(supply.id, "quantity", e.target.value)}
                      />
                      <FieldError message={errors[`items.${index}.quantity`]} />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-semibold text-fg">
                      Precio de partida por {supply.unit}
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        value={draft.startingPrice}
                        aria-invalid={errors[`items.${index}.startingPrice`] ? true : undefined}
                        onChange={(e) => updateDraft(supply.id, "startingPrice", e.target.value)}
                      />
                      <FieldError message={errors[`items.${index}.startingPrice`]} />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-semibold text-fg sm:col-span-3">
                      Especificaciones (opcional)
                      <textarea
                        className={inputClass}
                        rows={2}
                        maxLength={500}
                        placeholder="Ej: marca, calidad, presentación, plazo de entrega"
                        value={draft.specs}
                        onChange={(e) => updateDraft(supply.id, "specs", e.target.value)}
                      />
                      <FieldError message={errors[`items.${index}.specs`]} />
                    </label>
                    {targets && (
                      <p className="text-sm text-fg-muted sm:col-span-3">
                        Precio objetivo por ronda: {targets.map(formatMoney).join(" → ")}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <FormBanner message={serverError} />
      <FormBanner tone="success" message={draftSaved} />
      {publishBlocked ? (
        <div className="text-sm text-fg">{publishBlocked}</div>
      ) : (
        <p className="text-sm text-fg-muted">
          Una vez publicada, la licitación no se puede modificar: solo cancelar antes del cierre.
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <PrimaryButton type="submit" disabled={pending || Boolean(publishBlocked)}>
          {pending ? "Publicando…" : "Publicar licitación"}
        </PrimaryButton>
        <Button variant="ghost" size="md"
          type="button"
          onClick={onSaveDraft}
          disabled={savingDraft || selectedSupplies.length === 0}
          className={secondaryButtonClass}
        >
          {savingDraft ? "Guardando…" : "Guardar borrador"}
        </Button>
        {draft && (
          <Button variant="ghost" size="md"
            type="button"
            onClick={() => startTransition(() => discard())}
            disabled={discarding}
            className={secondaryButtonClass}
          >
            {discarding ? "Descartando…" : "Descartar borrador"}
          </Button>
        )}
      </div>
    </form>
  );
}
