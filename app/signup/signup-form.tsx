"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Path } from "react-hook-form";
import { z } from "zod";

import { SIGNUP_EMAIL_KEY } from "@/app/auth/check-email/signup-email";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { PasswordInput } from "@/components/forms/password-input";
import { TextField } from "@/components/forms/text-field";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import { useTransportAwareAction } from "@/components/forms/use-transport-aware-action";
import { signupFormSchema } from "@/lib/schemas/auth/auth";
import type { SignupState } from "@/lib/types/auth";

import { signup } from "./actions";

type SignupFormValues = z.infer<typeof signupFormSchema>;

const initialState: SignupState = undefined;
const SERVER_FIELDS: readonly Path<SignupFormValues>[] = ["displayName", "email", "password"];

// Dev-only server error preview (see the floating control below). NODE_ENV is
// statically replaced by Next at build time, so production builds eliminate
// the control entirely: no QA buttons ship, and no demo route exists.
const SHOW_ERROR_PREVIEW = process.env.NODE_ENV === "development";

type PreviewField = "displayName" | "email" | "password" | "confirmPassword";

// The preview never invents text: it parses deliberately invalid samples
// through the real screen contract and keeps the first message per field.
// displayName has no required rule (it is optional by schema), so its sample
// exercises its only real rule (the 81+ character limit).
function parsePreviewMessages(): Partial<Record<PreviewField, string>> {
  const firstMessage = (input: unknown, field: PreviewField): string | undefined => {
    const result = signupFormSchema.safeParse(input);
    if (result.success) return undefined;
    return z.flattenError(result.error).fieldErrors[field]?.[0];
  };

  return {
    displayName: firstMessage({ displayName: "x".repeat(81), email: "a@b.com", password: "segura-ejemplo", confirmPassword: "segura-ejemplo" }, "displayName"),
    email: firstMessage({ email: "correo-no-valido" }, "email"),
    password: firstMessage({ password: "corta" }, "password"),
    // Both passwords valid but different: only the mismatch rule reacts.
    confirmPassword: firstMessage({ email: "a@b.com", password: "segura-ejemplo", confirmPassword: "distinta-ejemplo" }, "confirmPassword"),
  };
}

const PREVIEW_FIELD_MESSAGES = SHOW_ERROR_PREVIEW ? parsePreviewMessages() : {};

export default function SignupForm() {
  const router = useRouter();
  const [showPreviewErrors, setShowPreviewErrors] = useState(false);
  const { action, transportError } = useTransportAwareAction(signup);
  const [state, submitAction, pending] = useActionState(action, initialState);
  const { register, handleSubmit, setError, clearErrors, formState: { errors } } = useForm<SignupFormValues>({ resolver: zodResolver(signupFormSchema) });
  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);

  // Account created: the next step is verifying the email, so continue to the
  // "check your email" screen instead of staying on the form.
  useEffect(() => {
    if (state?.ok) router.push("/auth/check-email");
  }, [state, router]);

  // Shows/hides the dev-only error preview by writing through RHF's own
  // mechanisms (setError/clearErrors), so the messages render exactly like
  // real ones: under each field, in red, with the Figma styles. Invalid
  // edits by the preview never reach the server; a real submit replaces
  // them with the resolver's result.
  useEffect(() => {
    if (!SHOW_ERROR_PREVIEW) return;
    if (showPreviewErrors) {
      for (const [field, message] of Object.entries(PREVIEW_FIELD_MESSAGES)) {
        if (message) setError(field as Path<SignupFormValues>, { type: "preview", message });
      }
    } else {
      clearErrors(Object.keys(PREVIEW_FIELD_MESSAGES) as Path<SignupFormValues>[]);
    }
  }, [showPreviewErrors, setError, clearErrors]);

  return (
    <form
      onSubmit={handleSubmit(({ displayName, email, password }) => {
        // Remembered only so the next screen can say where the link was sent.
        try { sessionStorage.setItem(SIGNUP_EMAIL_KEY, email); } catch {}
        return dispatchInTransition(submitAction)({ displayName, email, password });
      })}
      className="flex flex-col gap-3 lg:gap-3"
    >
      <TextField {...register("displayName")} id="displayName" type="text" label="Nombre y apellido" autoComplete="name" placeholder="Tu nombre y apellido" error={errors.displayName?.message} disabled={pending} />
      <TextField {...register("email")} id="email" type="email" label="Correo electrónico" autoComplete="email" placeholder="nombre@correo.com" error={errors.email?.message} disabled={pending} />

      <PasswordInput {...register("password")} id="password" label="Contraseña" autoComplete="new-password" hint="Mínimo 8 caracteres." error={errors.password?.message} disabled={pending} />
      <PasswordInput {...register("confirmPassword")} id="confirmPassword" label="Confirmar contraseña" autoComplete="new-password" error={errors.confirmPassword?.message} disabled={pending} />

      <p className="rounded-md border border-[#d7e5d9] bg-[#f8fcf8] px-3 py-2 text-[11px] leading-relaxed text-[#607565] lg:text-sm"><span className="font-semibold text-[#31503a]">Términos y condiciones:</span> Documentación pendiente. No se exigen todavía.</p>
      {state && !state.ok && !hasServerFieldErrors && <p role="alert" className="text-xs text-red-600">{state.message}</p>}
      {transportError && <p role="alert" className="text-xs text-red-600">{transportError}</p>}

      <button type="submit" disabled={pending || Boolean(state?.ok)} className="mt-1 h-10 w-full rounded-md bg-[#31df4f] px-4 text-sm font-bold text-[#103b1c] shadow-[0_4px_10px_rgba(37,213,73,0.35)] transition hover:bg-[#24ca42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168a3d] disabled:cursor-not-allowed disabled:bg-[#b5eebe] lg:h-[44px] lg:text-base">
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </button>
      <p className="text-center text-xs text-[#607565] lg:text-sm">¿Ya tenés cuenta? <Link href="/login" className="font-semibold text-[#168a3d] underline-offset-2 hover:underline">Iniciar sesión</Link></p>

      {SHOW_ERROR_PREVIEW && (
        <button
          type="button"
          onClick={() => setShowPreviewErrors((visible) => !visible)}
          aria-pressed={showPreviewErrors}
          className="fixed bottom-3 left-3 z-40 flex items-center gap-1.5 rounded-full border border-[#d6eadb] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#31503a] shadow-md transition hover:border-[#3ad85c] sm:left-auto sm:right-3"
        >
          <span aria-hidden="true" className={`size-2 rounded-full ${showPreviewErrors ? "bg-red-500" : "bg-[#3ad85c]"}`} />
          {showPreviewErrors ? "Ocultar errores (demo)" : "Mostrar errores (demo)"}
        </button>
      )}
    </form>
  );
}
