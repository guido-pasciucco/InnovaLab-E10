import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";
import { loginSchema } from "@/lib/schemas/auth/auth";
import {
  failResult,
  type ErrorCode,
} from "@/lib/api/error-catalog";
import { type LoginReason, type LoginResult } from "@/lib/types/auth";

// Maps new catalog codes back to legacy reasons until all
// consumers read code/message directly.
const reasonByCode: Record<ErrorCode, LoginReason> = {
  VALIDATION: "validation",
  CREDENTIALS: "credentials",
  UNAUTHORIZED: "unavailable",
  UNAVAILABLE: "unavailable",
  INTERNAL: "unavailable",
};

function loginFail(
  code: ErrorCode,
  details?: unknown,
): Extract<LoginResult, { ok: false }> {
  const base = failResult(code, details);
  return { ...base, reason: reasonByCode[code], error: base.message };
}

export async function loginService(
  client: SupabaseClient,
  // Entrada cruda y sin validar: las puertas (ruta y action) la pasan
  // tal cual la reciben. El servicio valida una sola vez y cubre a las dos.
  input: unknown,
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return loginFail("VALIDATION", parsed.error.flatten());
  }

  try {
    const { error } = await client.auth.signInWithPassword(parsed.data);

    if (error) {
      // Mensaje genérico a propósito: no se filtran detalles de auth.
      return loginFail("CREDENTIALS");
    }

    return { ok: true, data: {} };
  } catch {
    // Fallo inesperado (p. ej. Supabase caído): se modela como retorno
    // para que ambas puertas lo traduzcan (ruta → 500, action → estado).
    return loginFail("UNAVAILABLE");
  }
}
