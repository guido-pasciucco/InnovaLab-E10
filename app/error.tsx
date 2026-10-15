"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  console.error(error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-2xl font-bold">
        Ha ocurrido un error
      </h2>

      <p className="text-gray-600">
        Algo salió mal. Inténtalo de nuevo.
      </p>

      <button
        onClick={() => reset()}
        className="rounded bg-black px-4 py-2 text-white"
      >
        Reintentar
      </button>
    </div>
  );
}