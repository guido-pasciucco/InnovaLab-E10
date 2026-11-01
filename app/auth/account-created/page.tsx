import Link from "next/link";
import { CheckCircle } from "lucide-react";

import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { requireUser } from "@/lib/auth/require-user";

const BENEFITS = ["Valores productivos", "Historial de precios", "Planes para compartir"];

// Only reachable through /auth/confirm: the session exists once the email
// link was exchanged, so visitors without one are sent to /login.
export default async function AccountCreatedPage() {
  await requireUser();

  return (
    <AuthPageShell
      hero={
        <AuthHeroPanel
          badge="Paso previo: acceso"
          title="Guardá tus cálculos y retomalos cuando quieras"
          description="Creá tu cuenta gratis para tener tus productos, precios y escenarios siempre a mano."
          benefits={BENEFITS}
          benefitsLabel="Beneficios de crear una cuenta"
        />
      }
      title="¡Cuenta creada!"
      subtitle="Tu correo fue verificado correctamente y la cuenta ya está activa."
    >
      <div className="flex flex-col items-center gap-4">
        <CheckCircle aria-hidden="true" className="size-14 text-[#168a3d]" strokeWidth={1.5} />
        <Link
          href="/paso-1"
          className="flex h-10 w-full items-center justify-center rounded-md bg-[#31df4f] px-4 text-sm font-bold text-[#103b1c] shadow-[0_4px_10px_rgba(37,213,73,0.35)] transition hover:bg-[#24ca42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168a3d] lg:h-[44px] lg:text-base"
        >
          Ir a configuración inicial
        </Link>
      </div>
    </AuthPageShell>
  );
}
