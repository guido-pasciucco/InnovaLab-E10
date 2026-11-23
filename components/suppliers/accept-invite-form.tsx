"use client";

import { acceptSupplierInvite } from "@/app/proveedores/invitacion/[token]/actions";
import { useFormDataAction } from "@/components/forms/use-form-data-action";
import { FormBanner } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";

// An existing supplier links its account to one more emprendedor (RN-22).
export function AcceptInviteForm({ token, ownerName }: { token: string; ownerName: string }) {
  const { pending, onSubmit, formError } = useFormDataAction<unknown>(acceptSupplierInvite);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-fg">
        Ya tenés cuenta de proveedor. Vinculate con {ownerName} para ver sus licitaciones; no tenés que volver a cargar
        tus datos.
      </p>
      <FormBanner message={formError} />
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Vinculando…" : `Vincularme con ${ownerName}`}
      </PrimaryButton>
    </form>
  );
}
