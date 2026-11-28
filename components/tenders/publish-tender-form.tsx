"use client";

import { Button } from "@/components/ui/button";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from "react";

import { discardTenderDraft, publishTender, saveTenderDraft } from "@/app/(business)/licitaciones/actions";
import { FormBanner } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { targetPrices } from "@/lib/calc/tenderRounds";
import {
  DEFAULT_ROUND_COUNT,
  DEFAULT_ROUND_HOURS,
  roundCountField,
  roundHoursField,
} from "@/lib/schemas/tenders/fields";
import {
  publishFormErrors,
  type PublishTenderPayload,
  type SaveTenderDraftPayload,
  type TenderDraftFormState,
} from "@/lib/schemas/tenders/publish";
import { formatCuit } from "@/lib/schemas/suppliers/cuit";
import { formatMoney } from "./format";

type FormSupply = { id: string; name: string; unit: string; suggestedPrice: string };
type FormSupplier = { userId: string; businessName: string; cuit: string; categories: string[] };
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

function integerFieldMessage(field: typeof roundHoursField, value: string): string | undefined {
  const result = field.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

// Publish form (RN-02, RN-05). Supplies are picked from the catalog with the
// starting price prefilled from it; every linked supplier starts selected and
// the emprendedor unticks the ones not to invite. The form can be saved as a
// draft at any time (also without suppliers) and reopens from the one chosen
// in the tender list. `publishBlocked` explains why it cannot be published yet.
export function PublishTenderForm({
  supplies,
  suppliers,
  draft,
  saved,
  publishBlocked,
}: {
  supplies: FormSupply[];
  suppliers: FormSupplier[];
  draft: TenderDraftFormState | null;
  saved: boolean;
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
  const [invited, setInvited] = useState<string[]>(
    suppliers.map((s) => s.userId).filter((id) => !draft?.excludedSupplierIds.includes(id)),
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

  function toggleSupplier(id: string) {
    setInvited((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
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
    const payload: PublishTenderPayload = {
      roundHours,
      roundCount,
      decrementPercent,
      items: selectedSupplies.map((supply) => ({ supplyId: supply.id, ...drafts[supply.id] })),
      supplierIds: invited,
      draftId: draft?.id ?? null,
    };
    const found = publishFormErrors(payload);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    startTransition(() => dispatch(payload));
  }

  function onRoundFieldChange(key: "roundHours" | "roundCount", value: string) {
    const message = integerFieldMessage(key === "roundHours" ? roundHoursField : roundCountField, value);
    if (key === "roundHours") setRoundHours(value);
    else setRoundCount(value);
    setErrors((current) => ({ ...current, [key]: message ?? "" }));
  }

  function onSaveDraft() {
    const payload: SaveTenderDraftPayload = {
      roundHours,
      roundCount,
      decrementPercent,
      items: selectedSupplies.map((supply) => ({ supplyId: supply.id, ...drafts[supply.id] })),
      excludedSupplierIds: suppliers.map((s) => s.userId).filter((id) => !invited.includes(id)),
      draftId: draft?.id ?? null,
    };
    setErrors((current) => {
      const next: Record<string, string> = {};
      if (current.roundHours) next.roundHours = current.roundHours;
      if (current.roundCount) next.roundCount = current.roundCount;
      return next;
    });
    startTransition(() => saveDraft(payload));
  }

  const serverError =
    (state && !state.ok ? state.message : null) ??
    (draftState && !draftState.ok ? draftState.message : null) ??
    (discardState && !discardState.ok ? discardState.message : null);
  const draftSaved = saved ? "Borrador guardado. Podés seguir cuando quieras desde Licitaciones." : null;
  const hours = Number(roundHours);
  const rounds = Number(roundCount);
  const totalHours =
    Number.isInteger(hours) && Number.isInteger(rounds) && hours > 0 && rounds > 0 ? hours * rounds : null;

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <section className="space-y-4 rounded-3xl bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="rondas">
        <h2 id="rondas" className="text-lg font-bold text-fg">
          Rondas
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-base font-semibold text-fg">
            Duración de licitación
            <input
              className={inputClass}
              inputMode="numeric"
              placeholder="Ej: 6"
              value={roundHours}
              aria-invalid={errors.roundHours ? true : undefined}
              onChange={(e) => onRoundFieldChange("roundHours", e.target.value)}
            />
            <FieldError message={errors.roundHours} />
          </label>
          <label className="flex flex-col gap-1 text-base font-semibold text-fg">
            Cantidad de rondas
            <input
              className={inputClass}
              inputMode="numeric"
              placeholder="Ej: 4"
              value={roundCount}
              aria-invalid={errors.roundCount ? true : undefined}
              onChange={(e) => onRoundFieldChange("roundCount", e.target.value)}
            />
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
          {totalHours !== null ? `La licitación dura ${totalHours} horas desde que la publicás y cierra sola. ` : null}
          En cada ronda el precio objetivo baja ese porcentaje: es una referencia para los proveedores, no una
          obligación.
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

      <section className="space-y-4 rounded-3xl bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="invitados">
        <h2 id="invitados" className="text-lg font-bold text-fg">
          Proveedores invitados
        </h2>
        <p className="text-sm text-fg-muted">
          Están todos tus proveedores registrados. Destildá a los que no querés invitar: solo los tildados ven la
          licitación, en su panel.
        </p>
        <FieldError message={errors.supplierIds} />
        {suppliers.length === 0 && (
          <p className="text-sm text-fg">
            Todavía no tenés proveedores registrados. Guardá el borrador y{" "}
            <Link href="/proveedores" className="font-semibold text-brand-green-700 underline">
              invitá a tus proveedores
            </Link>
            : cuando se registren, aparecen acá para publicar.
          </p>
        )}
        <ul className="space-y-2">
          {suppliers.map((supplier) => (
            <li key={supplier.userId}>
              <label className="flex items-start gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  className="mt-1 size-4"
                  checked={invited.includes(supplier.userId)}
                  onChange={() => toggleSupplier(supplier.userId)}
                />
                <span>
                  <strong>{supplier.businessName}</strong> · CUIT {formatCuit(supplier.cuit)}
                  <span className="block text-fg-muted">Rubros: {supplier.categories.join(", ")}</span>
                </span>
              </label>
            </li>
          ))}
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
      {draft && (
        <p className="text-sm text-fg-muted">
          Estás editando el borrador N° {draft.number}.{" "}
          <Link href="/licitaciones/nueva" className="font-semibold text-brand-green-700 underline">
            Empezar otro borrador
          </Link>
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
            onClick={() => {
              const data = new FormData();
              data.set("draftId", draft.id);
              startTransition(() => discard(data));
            }}
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
