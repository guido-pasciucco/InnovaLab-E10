import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

import SignupForm from "./signup-form";

const BENEFITS = ["Valores productivos", "Historial de precios", "Planes para compartir"];

export default function SignupPage() {
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
      title="Crear cuenta"
      subtitle="Es gratis y te lleva un minuto."
    >
      <SignupForm />
    </AuthPageShell>
  );
}
