"use client";

import { useState } from "react";

import type { ErrorEnvelope } from "@/lib/errors/catalog";

// DEMO ONLY — remove this file with the /demo-errores section.
// Third path: a Route Handler answers with ErrorEnvelope and a client
// island decides how to render it inline, without an error.tsx.
type DemoRows = { rows: string[] };

type DemoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: DemoRows }
  | { status: "error"; envelope: ErrorEnvelope }
  | { status: "network" };

export function EnvelopeDemo() {
  const [state, setState] = useState<DemoState>({ status: "idle" });

  async function load(shouldFail: boolean) {
    setState({ status: "loading" });

    try {
      const response = await fetch(
        `/demo-errores/envelope${shouldFail ? "?fail=1" : ""}`,
      );
      const body: unknown = await response.json();

      if (!response.ok) {
        setState({ status: "error", envelope: body as ErrorEnvelope });
        return;
      }

      setState({ status: "success", data: body as DemoRows });
    } catch {
      setState({ status: "network" });
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void load(false)}
          disabled={state.status === "loading"}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          Pedir datos
        </button>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={state.status === "loading"}
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Forzar error 503
        </button>
      </div>

      {state.status === "loading" && (
        <p className="text-sm text-gray-500">Cargando…</p>
      )}

      {state.status === "success" && (
        <ul className="list-inside list-disc text-sm text-gray-700">
          {state.data.rows.map((row) => (
            <li key={row}>{row}</li>
          ))}
        </ul>
      )}

      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          {state.envelope.error.message}{" "}
          <code className="text-xs">({state.envelope.error.code})</code>
        </p>
      )}

      {state.status === "network" && (
        <p role="alert" className="text-sm text-red-600">
          No se pudo contactar al servidor.
        </p>
      )}
    </div>
  );
}
