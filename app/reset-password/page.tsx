import Link from "next/link";

import ResetPasswordForm from "./reset-password-form";
import { linkErrorMessage } from "./link-error";
import { linkErrorMessageEs } from "./link-error-messages";

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STEPS = [
  "Enlace seguro por correo",
  "Vence por seguridad",
  "Elegís una contraseña nueva",
];

function CalculatorMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`grid grid-cols-2 gap-0.5 rounded-[5px] bg-[#168a3d] p-1 ${className}`}>
      <span className="size-1.5 rounded-[1px] bg-white" />
      <span className="size-1.5 rounded-[1px] bg-white" />
      <span className="size-1.5 rounded-[1px] bg-white" />
      <span className="size-1.5 rounded-[1px] bg-white" />
    </span>
  );
}

// /auth/confirm sends users back here with `?error=<code>` when the email
// link could not be exchanged for a session.
export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const errorParam = (await searchParams).error;
  const linkErrorCode =
    typeof errorParam === "string" && linkErrorMessage(errorParam) !== null ? errorParam : null;
  const linkError = linkErrorCode ? linkErrorMessageEs(linkErrorCode) : null;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_0%_100%,#f8fffa_0,transparent_22rem),linear-gradient(135deg,#e7fff0_0%,#cef8da_52%,#bcf0ce_100%)] px-4 py-6 text-[#12321e] sm:px-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[64rem] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_25.25rem] lg:gap-10">
        <section className="max-w-md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#136831] lg:text-sm">
              <CalculatorMark className="lg:scale-125" />
              <span>Calculadora</span>
            </div>
            <span className="rounded-full border border-[#9edeb4] bg-white/70 px-2 py-1 text-[10px] font-medium text-[#39714b] lg:text-[13px]">
              Recuperar acceso
            </span>
          </div>

          <div className="mt-5 flex size-8 items-center justify-center rounded-lg bg-[#168a3d] shadow-sm lg:size-11">
            <CalculatorMark className="scale-75" />
          </div>

          <h1 className="mt-4 max-w-xs text-2xl font-bold leading-tight tracking-tight text-[#12321e] sm:text-3xl lg:max-w-md lg:text-[34px]">
            Recuperá el acceso a tu cuenta
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#497154] lg:text-base">
            Ingresá tu correo y te enviamos un enlace para crear una contraseña nueva.
          </p>

          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Cómo funciona la recuperación">
            {STEPS.map((step) => (
              <li key={step} className="flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#326842] shadow-sm lg:gap-2 lg:px-3 lg:py-1.5 lg:text-sm">
                <span aria-hidden="true" className="text-[#168a3d]">✓</span>
                {step}
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="reset-password-title"
          className="w-full rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_16px_36px_rgba(24,105,52,0.15)] sm:p-6 lg:p-7"
        >
          <h2 id="reset-password-title" className="text-xl font-bold tracking-tight text-[#12321e] lg:text-[24px]">
            Recuperar contraseña
          </h2>
          <p className="mt-1 text-xs text-[#5c7563] lg:text-base">
            Te enviaremos un enlace a tu correo.
          </p>

          <div className="mt-4">
            <ResetPasswordForm linkError={linkError} />
          </div>

          <p className="mt-4 text-center text-xs text-[#607565] lg:text-sm">
            ¿Ya recordás tu contraseña?{" "}
            <Link href="/login" className="font-semibold text-[#168a3d] underline-offset-2 hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
