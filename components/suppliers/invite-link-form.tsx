"use client";

import { useState } from "react";

import { createSupplierInvite } from "@/app/(flujo-1)/proveedores/actions";
import { useFormDataAction } from "@/components/forms/use-form-data-action";
import { FormBanner } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { formatDateTime } from "@/components/tenders/format";

// Generates a personal invite link and shows it once, ready to copy and send
// by any channel (RN-23). The app never sends it (RN-24).
export function InviteLinkForm() {
  const { state, pending, onSubmit, fieldErrors, formError } = useFormDataAction(createSupplierInvite);
  // The link that was copied, so a newly generated one starts uncopied.
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const created = state?.ok ? state.data : null;
  const copied = created !== null && copiedLink === created.link;

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(link);
    } catch {
      setCopiedLink(null);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" noValidate>
        <TextField
          label="¿Para quién es el enlace?"
          name="label"
          placeholder="Ej: Molino San José"
          maxLength={80}
          error={fieldErrors.label}
          required
        />
        <PrimaryButton type="submit" disabled={pending} className="sm:w-auto sm:px-6">
          {pending ? "Generando…" : "Generar enlace"}
        </PrimaryButton>
      </form>
      <FormBanner message={formError} />
      {created && (
        <div className="space-y-2 rounded-2xl border border-border-default p-4" aria-live="polite">
          <p className="text-sm text-fg">
            Enlace para <strong>{created.label}</strong>. Copialo ahora: por seguridad no se vuelve a mostrar.
            Sirve una sola vez y vence el {formatDateTime(created.expiresAt)}.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={created.link}
              aria-label="Enlace de invitación"
              className="min-h-11 w-full rounded-[10px] border border-border-control bg-surface-tint px-3 text-sm text-fg"
              onFocus={(event) => event.currentTarget.select()}
            />
            <button
              type="button"
              onClick={() => copy(created.link)}
              className="min-h-11 shrink-0 rounded-[14px] px-5 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-focus"
            >
              {copied ? "Copiado" : "Copiar enlace"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
