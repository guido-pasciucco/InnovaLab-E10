"use client";

import { registerSupplier, startSupplierSignup } from "@/app/proveedores/invitacion/[token]/actions";
import { PasswordInput } from "@/components/forms/password-input";
import { useFormDataAction } from "@/components/forms/use-form-data-action";
import { FormBanner } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";

type SupplierRegistrationFormProps = {
  token: string;
  ownerName: string;
  // "signup": new account (email + password, confirmed by email).
  // "profile": signed-in account that only needs the supplier data.
  mode: "signup" | "profile";
};

// Supplier data (annex 03, step 5: business, CUIT, contact and rubros) and the
// terms. In "signup" mode it also creates the account.
export function SupplierRegistrationForm({ token, ownerName, mode }: SupplierRegistrationFormProps) {
  const action = mode === "signup" ? startSupplierSignup : registerSupplier;
  const { state, pending, onSubmit, fieldErrors, formError } = useFormDataAction<unknown>(action);

  const sentTo = mode === "signup" && state?.ok ? (state.data as { email: string }).email : null;
  if (sentTo) {
    return (
      <div role="status" className="space-y-2 rounded-2xl bg-success-subtle p-4 text-sm text-fg">
        <p className="font-semibold">Revisá tu mail</p>
        <p>
          Te mandamos un enlace a <strong>{sentTo}</strong> para confirmar tu cuenta. Cuando lo abras, vas a quedar
          registrado como proveedor de {ownerName}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Nombre del negocio" name="businessName" autoComplete="organization" maxLength={120} error={fieldErrors.businessName} required />
        <TextField label="CUIT" name="cuit" inputMode="numeric" placeholder="20-12345678-6" error={fieldErrors.cuit} required />
        <TextField label="Persona de contacto" name="contactName" autoComplete="name" maxLength={120} error={fieldErrors.contactName} required />
        <TextField label="Teléfono" name="phone" type="tel" autoComplete="tel" error={fieldErrors.phone} required />
      </div>
      <TextField
        label="Rubros"
        name="categories"
        placeholder="Ej: harinas, lácteos, packaging"
        help={<span className="text-sm text-fg-muted">(separados por coma)</span>}
        error={fieldErrors.categories}
        required
      />
      {mode === "signup" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Mail" name="email" type="email" autoComplete="email" error={fieldErrors.email} required />
          <PasswordInput id="supplier-password" label="Contraseña" name="password" autoComplete="new-password" hint="Al menos 8 caracteres." error={fieldErrors.password} />
        </div>
      )}
      <div className="space-y-1">
        <label className="flex items-start gap-2 text-sm text-fg">
          <input type="checkbox" name="acceptTerms" className="mt-1 size-4" aria-invalid={fieldErrors.acceptTerms ? true : undefined} />
          <span>
            Acepto los términos de uso. Los avisos de las licitaciones los vas a ver en tu panel de la aplicación: no
            mandamos mails ni mensajes por eso.
          </span>
        </label>
        {fieldErrors.acceptTerms && (
          <p role="alert" className="text-sm text-danger">
            {fieldErrors.acceptTerms}
          </p>
        )}
      </div>
      <FormBanner message={formError} />
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Enviando…" : mode === "signup" ? "Crear cuenta de proveedor" : "Registrarme como proveedor"}
      </PrimaryButton>
    </form>
  );
}
