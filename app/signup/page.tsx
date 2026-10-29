import SignupForm from "./signup-form";
import Link from "next/link";

const BENEFITS = [
  {
    title: "Tu cálculo, guardado en la nube",
    description:
      "Guardá tu configuración y retomala desde cualquier dispositivo sin volver a cargar los datos.",
  },
  {
    title: "Precios con criterio",
    description:
      "Calculá el costo total y unitario de tu producto para fijar precios que cubran tus costos.",
  },
  {
    title: "Punto de equilibrio a la vista",
    description:
      "Conocé cuánto necesitás vender antes de que el negocio empiece a ganar dinero.",
  },
];

// Two-column layout on desktop (information + card) and stacked on mobile.
export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col justify-center bg-gray-50 px-4 py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-10 md:grid-cols-[1fr_24rem] md:items-center md:gap-14">
        <section className="flex flex-col gap-6">
          <p className="text-xl font-bold text-gray-900 md:text-2xl">
            Calculadora Inteligente de Costos
          </p>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              ¿Por qué crear una cuenta?
            </h2>
            <ul className="mt-3 flex flex-col gap-4">
              {BENEFITS.map(({ title, description }) => (
                <li key={title}>
                  <p className="font-medium text-gray-900">{title}</p>
                  <p className="text-sm text-gray-600">{description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="w-full rounded-lg bg-white p-8 shadow-md">
          <h1 className="text-center text-2xl font-bold text-gray-900">Crear cuenta</h1>
          <p className="mt-2 text-sm text-gray-600">
            Cargá tus datos y empezá a calcular tu producto.
          </p>
          <div className="mt-6">
            <SignupForm />
          </div>
          <p className="mt-6 text-center text-sm text-gray-600">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
