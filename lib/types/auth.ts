// Resultado del servicio de login, en términos del negocio —
// sin status HTTP, sin Response. Cada puerta lo traduce a su
// contrato (ruta → status, action → estado del form).
export type LoginResult =
  | { ok: true }
  | { ok: false; reason: "validation" | "credentials" | "unavailable"; error: string };

// Estado del form de login para useActionState.
// El inicial es undefined (todavía no se envió nada).
export type LoginState = LoginResult | undefined;
