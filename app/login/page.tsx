import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

import LoginForm from "./login-form";

const BENEFITS = ["Costo unitario", "Precio sugerido", "Punto de equilibrio"];

export default function LoginPage() {
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
      <LoginForm />
    </AuthPageShell>
  );
}
