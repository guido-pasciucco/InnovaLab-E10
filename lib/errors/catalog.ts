// Single source of truth for API error codes.
// Services reference codes only — messages, statuses and log levels live here.
//
// Naming convention (see lib/errors/README.md):
// - Generic codes (no prefix) are shared by every domain; their messages
//   must never mention a specific feature.
// - Domain codes use a DOMAIN_ prefix (AUTH_, COUPON_, ...). Create one
//   whenever the user needs a different message; never build the text in a service.
// - Field-level detail travels in `details`, not in the message.

export const ERROR_CATALOG = {
  // Generic
  VALIDATION: {
    status: 400,
    message: "Invalid input",
    logLevel: "warn",
  },
  UNAUTHORIZED: {
    status: 401,
    message: "Unauthorized",
    logLevel: "warn",
  },
  INTERNAL: {
    status: 500,
    message: "Something went wrong",
    logLevel: "error",
  },

  // Auth
  AUTH_INVALID_CREDENTIALS: {
    status: 401,
    message: "Invalid email or password",
    logLevel: "warn",
  },
  AUTH_UNAVAILABLE: {
    status: 500,
    message: "Authentication unavailable",
    logLevel: "error",
  },
  AUTH_SIGNUP_FAILED: {
    // Generic on purpose: never reveal whether the email already exists.
    status: 400,
    message: "Could not create account",
    logLevel: "warn",
  },
  AUTH_SIGNOUT_FAILED: {
    status: 500,
    message: "Could not sign out",
    logLevel: "error",
  },
  AUTH_PASSWORD_UPDATE_FAILED: {
    status: 401,
    message: "Could not update password",
    logLevel: "warn",
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

// JSON body of every failed Route Handler response. Lives in the core
// (no Next imports) so client components can type fetch errors with it.
export type ErrorEnvelope = {
  error: { code: ErrorCode; message: string; details?: unknown };
};

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
