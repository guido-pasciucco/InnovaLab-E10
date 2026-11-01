// Kept as a stable, non-sensitive marker because Supabase may wrap errors
// raised by its cookie storage subscriber before returning them to a service.
export const COOKIE_PERSISTENCE_ERROR = "AUTH_COOKIE_PERSISTENCE";

// Marks an auth change that reached Supabase but could not finish updating
// the browser cookie store. It intentionally carries no cookie details.
export class CookiePersistenceError extends Error {
  constructor() {
    super(COOKIE_PERSISTENCE_ERROR);
    this.name = "CookiePersistenceError";
  }
}

export function isCookiePersistenceError(error: unknown): error is CookiePersistenceError {
  let current = error;

  while (current instanceof Error) {
    if (
      current instanceof CookiePersistenceError ||
      current.name === "CookiePersistenceError" ||
      current.message === COOKIE_PERSISTENCE_ERROR
    ) return true;
    current = (current as Error & { cause?: unknown }).cause;
  }

  return false;
}
