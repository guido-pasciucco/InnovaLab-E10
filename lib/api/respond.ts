import { NextResponse } from "next/server";
import { ERROR_CATALOG, type ErrorCode } from "./error-catalog";

export type ErrorEnvelope = {
  error: { code: ErrorCode; message: string; details?: unknown };
};

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

type RouteHandler = (...args: never[]) => Promise<NextResponse>;

// Centralizes unexpected-error handling for route handlers.
// Expected failures are returned via fail(), never thrown;
// only bugs and infrastructure throws land here (logged, generic client body).
export function withApi<H extends RouteHandler>(
  handler: H,
  fallbackCode: ErrorCode = "UNAVAILABLE",
): H {
  const wrapped = async (...args: Parameters<H>): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error(`[api:${fallbackCode}]`, err);
      return fail(fallbackCode);
    }
  };
  return wrapped as H;
}
