"use client";

// Segment error boundary. Next 16.3.5 does not generate an ErrorProps type,
// so the props are declared manually. The copy stays generic on purpose:
// production masks the thrown error and only `digest` survives as a reference.

export default function CalculatorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 p-4">
      <h2 className="font-medium text-gray-900">Algo salió mal</h2>
      <p className="text-sm text-gray-700">
        No se pudo cargar esta sección. Esto puede ser un problema temporal.
      </p>
      {error.digest ? (
        <p className="text-sm text-gray-500">Referencia: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
      >
        Reintentar
      </button>
    </div>
  );
}
