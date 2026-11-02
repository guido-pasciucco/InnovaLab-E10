import Link from "next/link";
import { Mail } from "lucide-react";

import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

import { ResendButton } from "./resend-button";
import { SentTo } from "./sent-to";
import { VerifiedButton } from "./verified-button";

const BENEFITS = ["Varios productos", "Historial de precios", "Fichas para compartir"];

export default function CheckEmailPage() {
  return (
    <AuthPageShell
      hero={
        <AuthHeroPanel
          brand="Calculadora de Costos"
          badge="Paso previo: acceso"
          title="Guardá tus cálculos y retomalos cuando quieras"
          description="Creá tu cuenta gratis para tener tus productos, precios y escenarios siempre a mano."
          benefits={BENEFITS}
          benefitsLabel="Beneficios de crear una cuenta"
          footnote="Herramienta de apoyo. No reemplaza asesoramiento contable o impositivo."
        />
      }
      centered
      icon={
        <span className="grid size-16 place-items-center rounded-full border-2 border-[#3ad85c] bg-white text-[#168a3d] shadow-[0_0_18px_rgba(58,216,92,0.55)]">
          <Mail aria-hidden="true" className="size-6" strokeWidth={1.5} />
        </span>
      }
      title="Revisá tu correo"
      subtitle={<SentTo />}
    >
      <div className="flex flex-col gap-3">
        <VerifiedButton />
        <ResendButton />
        <p className="text-center text-[11px] text-[#607565] lg:text-xs">Si no lo ves, revisá spam o promociones.</p>
        <Link href="/signup" className="text-center text-xs font-semibold text-[#168a3d] underline underline-offset-2 lg:text-sm">
          Cambiar correo
        </Link>
      </div>
    </AuthPageShell>
  );
}
