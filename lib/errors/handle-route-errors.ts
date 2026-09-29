import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { toAppError } from "./app-error";
import { ERROR_CATALOG, type ErrorCode, type ErrorEnvelope } from "./catalog";

// Builds a consistent JSON error response from the catalog.
// `details` is omitted when undefined to keep bodies clean.
export function fail(code: ErrorCode, details?: unknown): NextResponse {
  const entry = ERROR_CATALOG[code];
  const body: ErrorEnvelope = {
    error:
      details === undefined
        ? { code, message: entry.message }
        : { code, message: entry.message, details },
  };
  return NextResponse.json(body, { status: entry.status });
}

export function ok<T>(data: T): NextResponse {
  return NextResponse.json(data);
}

// Route Handler door: the single place where thrown errors become HTTP.
// AppError → its catalog status; anything unknown → fallbackCode (logged).
export function handleRouteErrors<A extends unknown[]>(
  handler: (...args: A) => Promise<NextResponse>,
  fallbackCode: ErrorCode = "INTERNAL",
): (...args: A) => Promise<NextResponse> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      unstable_rethrow(err);
      const appError = toAppError(err, fallbackCode);
      return fail(appError.code, appError.details);
    }
  };
}
