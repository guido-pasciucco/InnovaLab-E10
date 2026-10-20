import { ERROR_CATALOG, type ErrorCode } from "@/lib/errors/catalog";

// Codes /auth/confirm may send back in `?error=`. Allowlisted so a
// crafted URL can only pick one of our own messages, never inject text.
// AUTH_SESSION_MISSING is also sent by the /update-password guard, which
// sends the user back here to request a new link.
const LINK_ERROR_CODES: readonly ErrorCode[] = [
  "AUTH_LINK_INVALID",
  "AUTH_RATE_LIMITED",
  "AUTH_UNAVAILABLE",
  "AUTH_SESSION_MISSING",
];

export function linkErrorMessage(code: string | string[] | undefined): string | null {
  if (typeof code !== "string") return null;
  const known = LINK_ERROR_CODES.find((candidate) => candidate === code);
  return known ? ERROR_CATALOG[known].message : null;
}
