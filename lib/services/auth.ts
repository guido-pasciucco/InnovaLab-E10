import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";
import { loginSchema } from "@/lib/schemas/auth/auth";
import { type LoginResult } from "@/lib/types/auth";

export async function loginService(
  client: SupabaseClient,
  // Entrada cruda y sin validar: las puertas (ruta y action) la pasan
  // tal cual la reciben. El servicio valida una sola vez y cubre a las dos.
  input: unknown,
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "validation", error: "Invalid email or password" };
  }

  try {
    const { error } = await client.auth.signInWithPassword(parsed.data);

    if (error) {
      // Mensaje genérico a propósito: no se filtran detalles de auth.
      return { ok: false, reason: "credentials", error: "Invalid credentials" };
    }

    return { ok: true };
  } catch {
    // Fallo inesperado (p. ej. Supabase caído): se modela como retorno
    // para que ambas puertas lo traduzcan (ruta → 500, action → estado).
    return { ok: false, reason: "unavailable", error: "Authentication unavailable" };
  }
}
