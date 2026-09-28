import { z, ZodError } from "zod";
import { ERROR_CATALOG, type ErrorCode } from "./catalog";

// Expected domain failure. Services throw it instead of returning
// result objects; the door adapters (handleRouteErrors / handleActionErrors) translate it.
// `details` travels to the client; `cause` (the technical reason, e.g.
// the raw Supabase error) only ever reaches the server log.
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly details?: unknown,
    options?: { cause?: unknown },
  ) {
    super(ERROR_CATALOG[code].message, options);
    this.name = "AppError";
  }
}

// Logs a known AppError at the level its catalog entry declares.
function logAppError(appError: AppError): void {
  const { logLevel } = ERROR_CATALOG[appError.code];
  if (logLevel === "silent") return;

  const label = `[${appError.code}] ${appError.message}`;
  const log = logLevel === "error" ? console.error : console.warn;
  if (appError.cause === undefined) log(label);
  else log(label, appError.cause);
}

// Normalizes any thrown value into an AppError and logs it.
// Known errors are logged per their catalog logLevel. Unknown throws are
// bugs or infrastructure failures: always logged as errors, exposed to
// the client only as the generic fallback code.
export function toAppError(
  err: unknown,
  fallbackCode: ErrorCode = "INTERNAL",
): AppError {
  if (err instanceof AppError) {
    logAppError(err);
    return err;
  }
  if (err instanceof ZodError) {
    const appError = new AppError("VALIDATION", z.flattenError(err));
    logAppError(appError);
    return appError;
  }

  console.error(`[${fallbackCode}]`, err);
  return new AppError(fallbackCode);
}
