// Spanish presentation for the codes /auth/confirm may send back.
// link-error.ts stays the allowlist: only its known codes get a message, so
// a crafted URL can never inject text. Shared by the page and the dev-only
// error preview so both render the exact same text.
export const LINK_ERROR_MESSAGES: Record<string, string> = {
  AUTH_LINK_INVALID: "El enlace no es válido o venció. Pedí uno nuevo para continuar.",
  AUTH_RATE_LIMITED: "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar.",
  AUTH_UNAVAILABLE: "No pudimos conectar con el servicio de acceso. Intentá de nuevo en unos minutos.",
};

export function linkErrorMessageEs(code: string): string | null {
  return LINK_ERROR_MESSAGES[code] ?? null;
}
