"use client";

import { Button } from "@/components/ui/button";

import { useState } from "react";

import { awardItem, issuePurchaseOrder, requestNegotiation, sendThankYouNote } from "@/app/(business)/licitaciones/actions";
import { useFormDataAction } from "@/components/forms/use-form-data-action";
import { FormBanner } from "@/components/ui/page-shell";
import { formatMoney } from "./format";

// Forms used after the close (RN-14, RN-15, RN-16, RN-21). Each posts to its
// own action; the service checks the tender is closed and owned.

const inputClass =
  "min-h-11 w-full rounded-[10px] border border-border-control bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-invalid:border-danger";
const buttonClass =
  "min-h-11! shrink-0! rounded-[14px]! bg-action-primary! px-4! text-sm! font-semibold! text-on-action-primary! hover:bg-action-primary-hover! disabled:opacity-60!";

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  ) : null;
}

type Candidate = { invitationId: string; businessName: string; unitPrice: string };

// RN-14: one supplier per item, among those that offered for it. The agreed
// price starts at that supplier's last offer and can be changed after a
// negotiation.
export function AwardItemForm({
  tenderId,
  itemId,
  unit,
  candidates,
  current,
}: {
  tenderId: string;
  itemId: string;
  unit: string;
  candidates: Candidate[];
  current: { invitationId: string; unitPrice: string } | null;
}) {
  const { pending, onSubmit, fieldErrors, formError } = useFormDataAction<unknown>(awardItem);
  const initial = current?.invitationId ?? candidates[0]?.invitationId ?? "";
  const [invitationId, setInvitationId] = useState(initial);
  const [unitPrice, setUnitPrice] = useState(
    current?.unitPrice ?? candidates.find((c) => c.invitationId === initial)?.unitPrice ?? "",
  );

  function choose(id: string) {
    setInvitationId(id);
    setUnitPrice(candidates.find((c) => c.invitationId === id)?.unitPrice ?? "");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
      <input type="hidden" name="tenderId" value={tenderId} />
      <input type="hidden" name="itemId" value={itemId} />
      <label className="flex flex-col gap-1 text-sm font-semibold text-fg">
        Le compro a
        <select name="invitationId" className={inputClass} value={invitationId} onChange={(e) => choose(e.target.value)}>
          {candidates.map((candidate) => (
            <option key={candidate.invitationId} value={candidate.invitationId}>
              {candidate.businessName} ({formatMoney(candidate.unitPrice)})
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-fg">
        Precio acordado por {unit}
        <input
          name="unitPrice"
          inputMode="decimal"
          className={inputClass}
          value={unitPrice}
          aria-invalid={fieldErrors.unitPrice ? true : undefined}
          onChange={(e) => setUnitPrice(e.target.value)}
        />
      </label>
      <Button variant="primary" size="md" type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Guardando…" : current ? "Cambiar" : "Elegir"}
      </Button>
      <div className="sm:col-span-3">
        <FieldError message={fieldErrors.unitPrice} />
        <FormBanner message={formError} />
      </div>
    </form>
  );
}

// RN-21: the supplier sees this contact in its panel; the negotiation goes on
// outside the app.
export function NegotiationForm({
  tenderId,
  invitationId,
  defaultContact,
}: {
  tenderId: string;
  invitationId: string;
  defaultContact: string;
}) {
  const { pending, onSubmit, fieldErrors, formError } = useFormDataAction<unknown>(requestNegotiation);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(true)} className="text-sm! font-semibold! text-brand-green-700! underline!">
        Pedir negociar
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="tenderId" value={tenderId} />
      <input type="hidden" name="invitationId" value={invitationId} />
      <label className="flex flex-col gap-1 text-sm font-semibold text-fg">
        Tu contacto para el proveedor
        <input
          name="contact"
          defaultValue={defaultContact}
          className={inputClass}
          aria-invalid={fieldErrors.contact ? true : undefined}
        />
      </label>
      <FieldError message={fieldErrors.contact} />
      <p className="text-sm text-fg-muted">El proveedor lo ve en su panel. La negociación sigue por fuera de la aplicación.</p>
      <Button variant="primary" size="md" type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Enviando…" : "Avisar al proveedor"}
      </Button>
      <FormBanner message={formError} />
    </form>
  );
}

// RN-15: delivery and payment terms; the order is final once generated.
export function PurchaseOrderForm({ tenderId, invitationId }: { tenderId: string; invitationId: string }) {
  const { pending, onSubmit, fieldErrors, formError } = useFormDataAction<unknown>(issuePurchaseOrder);

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="tenderId" value={tenderId} />
      <input type="hidden" name="invitationId" value={invitationId} />
      <label className="flex flex-col gap-1 text-sm font-semibold text-fg">
        Condiciones de entrega
        <textarea
          name="deliveryTerms"
          rows={2}
          maxLength={500}
          placeholder="Ej: en el local, el lunes de 8 a 12"
          className={inputClass}
          aria-invalid={fieldErrors.deliveryTerms ? true : undefined}
        />
      </label>
      <FieldError message={fieldErrors.deliveryTerms} />
      <label className="flex flex-col gap-1 text-sm font-semibold text-fg">
        Condiciones de pago
        <textarea
          name="paymentTerms"
          rows={2}
          maxLength={500}
          placeholder="Ej: transferencia a 15 días"
          className={inputClass}
          aria-invalid={fieldErrors.paymentTerms ? true : undefined}
        />
      </label>
      <FieldError message={fieldErrors.paymentTerms} />
      <p className="text-sm text-fg-muted">
        Una vez generada, la orden no se puede cambiar. La imprimís o la guardás como PDF y se la mandás vos.
      </p>
      <Button variant="primary" size="md" type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Generando…" : "Generar orden de compra"}
      </Button>
      <FormBanner message={formError} />
    </form>
  );
}

// RN-16: the same note for every supplier not chosen, without prices or
// results. Shown once ordered; it cannot be withdrawn.
export function ThankYouNoteButton({ tenderId }: { tenderId: string }) {
  const { pending, onSubmit, formError } = useFormDataAction<unknown>(sendThankYouNote);

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="tenderId" value={tenderId} />
      <Button variant="primary" size="md" type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Enviando…" : "Mostrar la nota de agradecimiento"}
      </Button>
      <FormBanner message={formError} />
    </form>
  );
}
