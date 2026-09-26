// Single source of truth for API error codes.
// Services reference codes only — messages, statuses and log levels live here.

export const ERROR_CATALOG = {
  VALIDATION: {
    status: 400,
    message: "Invalid email or password",
    logLevel: "warn",
  },
  CREDENTIALS: {
    status: 401,
    message: "Invalid credentials",
    logLevel: "warn",
  },
  UNAUTHORIZED: {
    status: 401,
    message: "Unauthorized",
    logLevel: "warn",
  },
  UNAVAILABLE: {
    status: 500,
    message: "Authentication unavailable",
    logLevel: "error",
  },
  INTERNAL: {
    status: 500,
    message: "Something went wrong",
    logLevel: "error",
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; details?: unknown };

// Builds the failure side of a ServiceResult from the catalog,
// so services never hardcode messages or statuses.
export function failResult(
  code: ErrorCode,
  details?: unknown,
): Extract<ServiceResult<never>, { ok: false }> {
  return {
    ok: false,
    code,
    message: ERROR_CATALOG[code].message,
    details,
  };
}

export function okResult<T>(data: T): Extract<ServiceResult<T>, { ok: true }> {
  return { ok: true, data };
}
