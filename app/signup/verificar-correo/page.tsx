import type { Metadata } from "next";

import { emailField } from "@/lib/schemas/auth/fields";

import VerifyEmailClient from "./verificar-correo-client";

export const metadata: Metadata = {
  title: "Revisá tu correo",
};

type VerifyEmailPageProps = {
  searchParams: Promise<{
    email?: string | string[];
  }>;
};

const BENEFITS = ["Varios productos", "Historial de precios", "Fichas para compartir"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function CalculatorMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid grid-cols-2 gap-0.5 rounded-[5px] bg-[#168a3d] p-1 ${className}`}
    >
      <span className="size-1.5 rounded-[1px] bg-white" />
      <span className="size-1.5 rounded-[1px] bg-white" />
      <span className="size-1.5 rounded-[1px] bg-white" />
      <span className="size-1.5 rounded-[1px] bg-white" />
    </span>
  );
}

function EnvelopeIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 132"
      fill="none"
      className="relative h-full w-full max-w-[19rem] drop-shadow-[0_10px_18px_rgba(22,138,61,0.16)]"
    >
      <rect x="38" y="18" width="164" height="98" rx="14" fill="#ffffff" />
      <path
        d="M42 30c0-5.5 4.5-10 10-10h136c5.5 0 10 4.5 10 10v8L120 84 42 38v-8Z"
        fill="#d9f8e2"
      />
      <path
        d="m44 36 68 41a14 14 0 0 0 14.6 0L196 36"
        stroke="#168a3d"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="188" cy="100" r="24" fill="#31df4f" />
      <path
        d="m177 100 7 7 14-15"
        stroke="#103b1c"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const parsedEmail = emailField.safeParse(firstParam(params.email));
  const email = parsedEmail.success ? parsedEmail.data : "";

  return (
    <main className="min-h-screen px-4 py-6 text-[#12321e] sm:px-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[64rem] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_25.25rem] lg:gap-10">
        <section aria-labelledby="verify-email-intro" className="max-w-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#136831] lg:text-sm">
              <CalculatorMark className="lg:scale-125" />
              <span>Calculadora</span>
            </div>
            <span className="rounded-full border border-[#9edeb4] bg-white/70 px-2 py-1 text-[10px] font-medium text-[#39714b] lg:text-[13px]">
              Paso previo: acceso
            </span>
          </div>

          <p
            id="verify-email-intro"
            className="mt-6 max-w-xs text-2xl font-bold leading-tight tracking-tight text-[#12321e] sm:text-3xl lg:max-w-md lg:text-[34px]"
          >
            Solo falta confirmar tu correo
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#497154] lg:text-base">
            Abrí el enlace que te enviamos para activar tu cuenta y guardar tus productos,
            precios y escenarios.
          </p>

          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Beneficios de crear una cuenta">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#326842] shadow-sm lg:gap-2 lg:px-3 lg:py-1.5 lg:text-sm"
              >
                <span aria-hidden="true" className="text-[#168a3d]">
                  ✓
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="relative mt-6 hidden h-36 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-white/45 sm:flex">
            <div className="absolute -left-8 -top-10 size-32 rounded-full bg-[#b9f3cb]/70 blur-2xl" />
            <div className="absolute -bottom-12 right-0 size-32 rounded-full bg-[#31df4f]/25 blur-2xl" />
            <EnvelopeIllustration />
          </div>

          <p className="mt-5 max-w-sm text-xs leading-relaxed text-[#607565]">
            Herramienta de apoyo. No reemplaza asesoramiento contable o impositivo.
          </p>
        </section>

        <section
          aria-labelledby="verify-email-title"
          className="w-full rounded-2xl border border-white/80 bg-white p-5 shadow-[0_16px_36px_rgba(24,105,52,0.15)] sm:p-6 lg:p-7"
        >
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#d9f8e2] text-[#168a3d]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-7"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </div>

          <h1
            id="verify-email-title"
            className="mt-4 text-center text-2xl font-bold tracking-tight text-[#12321e] lg:text-[26px]"
          >
            Revisá tu correo
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-[#5c7563] lg:text-base">
            Te enviamos un enlace a{" "}
            {email ? (
              <span className="break-all font-semibold text-[#12321e]">{email}</span>
            ) : (
              "tu correo electrónico"
            )}{" "}
            para activar tu cuenta.
          </p>

          <VerifyEmailClient email={email} />

          <p className="mt-5 text-center text-xs leading-relaxed text-[#607565]">
            Si no lo ves, revisá spam o promociones.
          </p>
        </section>
      </div>
    </main>
  );
}
