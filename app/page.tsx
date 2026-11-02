import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { getOptionalUser } from "@/lib/auth/optional-user";
import { getCalculatorProgressService } from "@/lib/services/calculator";
import { resumeHref } from "@/components/calculator/wizard/wizard-steps";

export const metadata: Metadata = {
  title: "Inicio",
};

type Feature = {
  title: string;
  description: string;
};

const features: readonly Feature[] = [
  {
    title: "Costos",
    description: "Cargá tus costos fijos y variables para conocer cuánto te cuesta producir.",
  },
  {
    title: "Precios",
    description: "Definí precios de venta a partir de tus costos y del margen que buscás.",
  },
  {
    title: "Punto de equilibrio",
    description: "Calculá cuántas unidades necesitás vender para no perder dinero.",
  },
];

const CALCULATOR_START_HREF = "/paso-1";

// A signed-in user resumes at the furthest step saved in the database; anyone
// else, or anyone whose progress cannot be read, starts at the first step.
// The home must never break because of the calculator.
async function getCalculatorStartHref(): Promise<string> {
  const user = await getOptionalUser();
  if (!user) return CALCULATOR_START_HREF;

  try {
    const { currentStep } = await getCalculatorProgressService(user.id);
    return resumeHref(currentStep);
  } catch (err) {
    unstable_rethrow(err);
    console.error("[home] calculator progress failed", err);
    return CALCULATOR_START_HREF;
  }
}

// Server Component: reads the session only to pick where "Empezar cálculo"
// goes, so it renders on demand.
export default async function HomePage() {
  const startHref = await getCalculatorStartHref();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-16 px-6 py-16">
      <Hero startHref={startHref} />
      <FeatureList features={features} />
      <AccountLinks />
    </main>
  );
}

function Hero({ startHref }: { startHref: string }) {
  return (
    <section aria-labelledby="hero-title" className="flex flex-col gap-6 text-center sm:text-left">
      <h1 id="hero-title" className="text-4xl font-semibold tracking-tight">
        Calculadora de costos y precios
      </h1>
      <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        Calculá tus costos, definí tus precios y encontrá tu punto de equilibrio en pocos pasos.
      </p>
      <div>
        <Link
          href={startHref}
          className="inline-block rounded-md bg-zinc-900 px-5 py-3 font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Empezar cálculo
        </Link>
      </div>
    </section>
  );
}

function FeatureList({ features }: { features: readonly Feature[] }) {
  return (
    <section aria-labelledby="features-title" className="flex flex-col gap-6">
      <h2 id="features-title" className="text-2xl font-semibold">
        ¿Qué podés hacer?
      </h2>
      <ul className="grid gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <li
            key={feature.title}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <h3 className="font-medium">{feature.title}</h3>
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {feature.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AccountLinks() {
  return (
    <nav aria-label="Cuenta" className="flex flex-wrap gap-4 text-sm">
      <Link href="/login" className="font-medium underline underline-offset-4">
        Iniciar sesión
      </Link>
      <Link href="/signup" className="font-medium underline underline-offset-4">
        Crear cuenta
      </Link>
    </nav>
  );
}
