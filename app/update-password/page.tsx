import Link from "next/link";

import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { requireUser } from "@/lib/auth/require-user";

import UpdatePasswordForm from "./update-password-form";

const TIPS = ["Mínimo 8 caracteres", "Confirmación para evitar errores", "Volvés al inicio de sesión al guardar"];

export default async function UpdatePasswordPage() {
  // A visitor without a recovery session never sees the form. Sending them
  // back with the same code the Server Action uses keeps one message for
  // both an expired link and a session lost after the page was loaded.
  await requireUser({ redirectTo: "/reset-password?error=AUTH_SESSION_MISSING" });

  return (
    <AuthPageShell
      hero={
        <AuthHeroPanel
          badge="Nueva contraseña"
          title="Creá una contraseña nueva"
          description="Elegí una contraseña segura para volver a entrar a tu cuenta."
          benefits={TIPS}
          benefitsLabel="Requisitos de la nueva contraseña"
        />
      }
      title="Nueva contraseña"
      subtitle="Ingresá y confirmá tu nueva contraseña."
    >
      <UpdatePasswordForm />

      <p className="mt-4 text-center text-xs text-fg-muted lg:text-sm">
        ¿Querés volver?{" "}
        <Link href="/login" className="font-semibold text-link underline-offset-2 hover:underline">
          Iniciar sesión
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-fg-muted lg:text-sm">
        ¿El enlace venció?{" "}
        <Link href="/reset-password" className="font-semibold text-link underline-offset-2 hover:underline">
          Solicitar un enlace nuevo
        </Link>
      </p>
    </AuthPageShell>
  );
}
