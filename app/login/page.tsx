import { linkErrorMessage } from "@/app/reset-password/link-error";
import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

import LoginForm from "./login-form";

const BENEFITS = ["Costo unitario", "Precio sugerido", "Punto de equilibrio"];

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// /auth/confirm sends users back here with `?error=<code>` when the signup
// confirmation link could not be exchanged for a session.
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const linkError = linkErrorMessage((await searchParams).error);

  return (
    <AuthPageShell
      hero={
        <AuthHeroPanel
          brand="Calculadora de Costos"
          badge="Paso previo: acceso"
          title="Conocé el costo real de lo que vendés"
          description="Calculá costos, precio sugerido y punto de equilibrio con un recorrido guiado."
          benefits={BENEFITS}
          benefitsLabel="Beneficios de la calculadora"
          footnote="Herramienta de apoyo. No reemplaza asesoramiento contable o impositivo."
        />
      }
      title="Iniciar sesión"
      subtitle="Ingresá para guardar y retomar tus cálculos."
    >
      {linkError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-center text-sm text-red-700">
          {linkError}
        </p>
      )}
      <LoginForm />
    </AuthPageShell>
  );
}
