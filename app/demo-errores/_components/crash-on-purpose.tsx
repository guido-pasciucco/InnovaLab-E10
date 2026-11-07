"use client";

import { useState } from "react";

// DEMO ONLY — remove this file with the /demo-errores section.
// Throwing during render is what a component boundary can catch. Throws
// from event handlers are NOT caught by any boundary; those need a
// try/catch or an action result.
export function CrashOnPurpose() {
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error("Demo: intentional render crash");
  }

  return (
    <button
      type="button"
      onClick={() => setShouldCrash(true)}
      className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
    >
      Romper este bloque
    </button>
  );
}
