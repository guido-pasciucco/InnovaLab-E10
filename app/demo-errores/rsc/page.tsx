import type { Metadata } from "next";
import Link from "next/link";

import { AppError } from "@/lib/errors/app-error";
import { handleRscErrors } from "@/lib/errors/handle-rsc-errors";

// DEMO ONLY — remove this file with the /demo-errores section.
export const metadata: Metadata = {
  title: "Lectura RSC con error",
};

type DemoRscPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const DEMO_ROWS = ["Fila A", "Fila B"] as const;

export default async function DemoRscPage({ searchParams }: DemoRscPageProps) {
  const { fail } = await searchParams;

  // A failed read goes through the RSC door: it logs per the catalog and
  // always re-throws, so ./error.tsx (this segment's boundary) renders.
  const rows = await handleRscErrors(async () => {
    if (fail === "1") {
      throw new AppError("CALC_UNAVAILABLE");
    }

    return DEMO_ROWS;
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <nav className="text-sm">
        <Link href="/demo-errores" className="underline underline-offset-4">
          ← Volver a la demo
        </Link>
      </nav>

      <h1 className="text-2xl font-semibold">Lectura RSC con error</h1>
      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Esta página lee datos en el servidor. Con <code>?fail=1</code> la
        lectura lanza <code>CALC_UNAVAILABLE</code> dentro de{" "}
        <code>handleRscErrors</code>: el error sube hasta <code>error.tsx</code>{" "}
        de este segmento y reemplaza la página entera.
      </p>

      <ul className="list-inside list-disc text-sm">
        {rows.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>

      <Link
        href="/demo-errores/rsc?fail=1"
        className="self-start font-medium text-red-700 underline underline-offset-4"
      >
        Disparar el error (recarga con ?fail=1)
      </Link>
    </main>
  );
}
