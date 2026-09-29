"use server";

import { type LoginState } from "@/lib/types/auth";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";
import { loginService } from "@/lib/services/auth";

// La action recibe los datos ya validados por RHF en el cliente.
// El servicio revalida igual del lado del servidor (la validación
// del cliente es UX, nunca seguridad).
export async function login(
  _prevState: LoginState,
  data: { email: string; password: string },
): Promise<Exclude<LoginState, undefined>> {
  // Puerta action: el cliente se crea con cookies() (sin Request),
  // y las cookies de sesión se escriben directo en el store.
  const client = await createRscSupabaseClient();

  // El resultado del servicio ES el estado del form.
  return loginService(client, data);
}
