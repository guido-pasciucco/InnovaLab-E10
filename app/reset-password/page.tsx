import Link from "next/link";

import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

import ResetPasswordForm from "./reset-password-form";
import { linkErrorMessage } from "./link-error";

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STEPS = ["Enlace seguro por correo", "Vence por seguridad", "Elegís una contraseña nueva"];

// /auth/confirm sends users back here with `?error=<code>` when the email
// link could not be exchanged for a session.
export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const linkError = linkErrorMessage((await searchParams).error);

  return (
    <AuthPageShell
      hero={
        <AuthHeroPanel
          badge="Recuperar acceso"
          title="Recuperá el acceso a tu cuenta"
          description="Ingresá tu correo y te enviamos un enlace para crear una contraseña nueva."
          benefits={STEPS}
          benefitsLabel="Cómo funciona la recuperación"
        />
      }
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace a tu correo."
    >
      <ResetPasswordForm linkError={linkError} />

      <p className="mt-4 text-center text-xs text-fg-muted lg:text-sm">
        ¿Ya recordás tu contraseña?{" "}
        <Link href="/login" className="font-semibold text-link underline-offset-2 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </AuthPageShell>
  );
}
