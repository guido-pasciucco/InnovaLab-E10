import { z, ZodError } from "zod";
import { ERROR_CATALOG, type ErrorCode } from "./catalog";

// Expected domain failure. Services throw it instead of returning
// result objects; the door adapters (handleRouteErrors / handleActionErrors) translate it.
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly details?: unknown,
  ) {
    super(ERROR_CATALOG[code].message);
    this.name = "AppError";
  }
}

// Normalizes any thrown value into an AppError.
// Unknown throws are bugs or infrastructure failures: logged here,
// exposed to the client only as the generic fallback code.
export function toAppError(
  err: unknown,
  fallbackCode: ErrorCode = "INTERNAL",
): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) return new AppError("VALIDATION", z.flattenError(err));

  console.error(`[${fallbackCode}]`, err);
  return new AppError(fallbackCode);
}
