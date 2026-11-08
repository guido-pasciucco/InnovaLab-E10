"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Path } from "react-hook-form";
import { z } from "zod";

import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { PasswordInput } from "@/components/forms/password-input";
import { TextField } from "@/components/forms/text-field";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import { useTransportAwareAction } from "@/components/forms/use-transport-aware-action";
import { loginSchema } from "@/lib/schemas/auth/auth";
import type { LoginState } from "@/lib/types/auth";

import { login } from "./actions";

const initialState: LoginState = undefined;

// Los tipos salen del schema compartido (fuente única): si cambia
// el schema, el form se entera solo.
type LoginFormValues = z.infer<typeof loginSchema>;

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<LoginFormValues>[] = ["email", "password"];

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-xs text-danger lg:text-sm"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="mt-0.5 size-4 shrink-0"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 16h.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const { action, transportError, clearTransportError } = useTransportAwareAction(login);
  const [state, submitAction, pending] = useActionState(action, initialState);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);

  useEffect(() => {
    if (state?.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  }, [state, router]);

  // A transport failure wins over the server message: the request never
  // arrived, so the previous state is not meaningful anymore.
  const generalError =
    transportError ?? (state && !state.ok && !hasServerFieldErrors ? state.message : null);

  return (
    // RHF valida en el cliente con el mismo schema; solo si pasa,
    // despacha a la action (envuelta en transición por el helper).
    // Editing a field or retrying clears a stale transport banner, so it does
    // not outlive a client-side validation failure.
    <form
      onChange={clearTransportError}
      onSubmit={(event) => {
        clearTransportError();
        return handleSubmit(dispatchInTransition(submitAction))(event);
      }}
      className="flex flex-col gap-3"
    >
      {generalError && <ErrorBanner message={generalError} />}

      {state?.ok && (
        <p
          role="status"
          className="rounded-md border border-success/30 bg-success-subtle px-3 py-2 text-xs text-success lg:text-sm"
        >
          Sesión iniciada correctamente. Redirigiendo…{" "}
          <Link href="/dashboard" className="font-semibold underline underline-offset-2">
            Continuar
          </Link>
        </p>
      )}

      <TextField
        {...register("email")}
        id="email"
        type="email"
        label="Correo electrónico"
        autoComplete="email"
        placeholder="nombre@correo.com"
        icon={<MailIcon />}
        error={errors.email?.message}
        disabled={pending}
      />

      <PasswordInput
        {...register("password")}
        id="password"
        label="Contraseña"
        autoComplete="current-password"
        icon={<LockIcon />}
        error={errors.password?.message}
        disabled={pending}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor="remember"
          className="flex items-center gap-2 text-xs font-medium text-fg-muted lg:text-sm"
        >
          <input
            id="remember"
            name="remember"
            type="checkbox"
            className="size-4 rounded border-border-control accent-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
          Recordarme
        </label>
        <Link
          href="/reset-password"
          className="text-xs font-semibold text-link underline-offset-2 hover:underline lg:text-sm"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <button
        type="submit"
        disabled={pending || Boolean(state?.ok)}
        className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-action-primary px-4 text-sm font-bold text-on-action-primary shadow-[0_4px_10px_rgba(10,122,18,0.3)] transition hover:bg-action-primary-hover active:bg-action-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:bg-action-disabled disabled:text-fg-disabled lg:h-[44px] lg:text-base"
      >
        {pending ? "Ingresando…" : "Ingresar"}
        {!pending && <ArrowIcon />}
      </button>

      <div aria-hidden="true" className="flex items-center gap-3 text-[11px] font-medium text-fg-muted lg:text-sm">
        <span className="h-px flex-1 bg-border-default" />
        <span>o</span>
        <span className="h-px flex-1 bg-border-default" />
      </div>

      <Link
        href="/"
        className="flex h-10 w-full items-center justify-center rounded-md border border-border-default bg-action-tonal px-4 text-sm font-semibold text-on-action-tonal transition hover:border-accent-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus lg:h-[42px] lg:text-base"
      >
        Continuar sin cuenta
      </Link>

      <p className="text-center text-xs text-fg-muted lg:text-sm">
        ¿No tenés cuenta?{" "}
        <Link href="/signup" className="font-semibold text-link underline-offset-2 hover:underline">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
