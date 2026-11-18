import type { ErrorCode } from "@/lib/errors/catalog";

// Spanish presentation for the auth codes these screens show. The allowlist
// of codes that may arrive from /auth/confirm lives in
// app/reset-password/link-error.ts; this map only translates codes, so a
// crafted URL can never inject text. Keeping the text here means the login,
// reset and update screens cannot drift apart.
const AUTH_ERROR_MESSAGES = {
  AUTH_LINK_INVALID: "El enlace no es válido o venció. Pedí uno nuevo para continuar.",
  AUTH_RATE_LIMITED: "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar.",
  AUTH_UNAVAILABLE: "No pudimos conectar con el servicio de acceso. Intentá de nuevo en unos minutos.",
  AUTH_SESSION_MISSING: "Tu sesión venció. Pedí un enlace nuevo para continuar.",
  AUTH_PASSWORD_UPDATE_FAILED: "No pudimos actualizar la contraseña. Probá con otra que cumpla los requisitos.",
  VALIDATION: "Revisá los datos ingresados.",
} as const satisfies Partial<Record<ErrorCode, string>>;

export function authErrorMessage(code: string | null | undefined): string | null {
  if (typeof code !== "string" || !(code in AUTH_ERROR_MESSAGES)) {
    return null;
  }

  return AUTH_ERROR_MESSAGES[code as keyof typeof AUTH_ERROR_MESSAGES];
}
