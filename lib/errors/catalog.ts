// Single source of truth for API error codes.
// Services reference codes only — messages, statuses and log levels live here.
//
// Naming convention (see lib/errors/AGENTS.md):
// - Generic codes (no prefix) are shared by every domain; their messages
//   must never mention a specific feature.
// - Domain codes use a DOMAIN_ prefix (AUTH_, COUPON_, ...). Create one
//   whenever the user needs a different message; never build the text in a service.
// - Field-level detail travels in `details`, not in the message.
//
// logLevel is read by toAppError when a door translates the error:
// "silent" for routine user mistakes, "warn" for expected failures worth
// tracking, "error" for infrastructure failures.

export type LogLevel = "silent" | "warn" | "error";

type CatalogEntry = { status: number; message: string; logLevel: LogLevel };

export const ERROR_CATALOG = {
  // Generic
  VALIDATION: {
    status: 400,
    message: "Invalid input",
    logLevel: "silent",
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
  AUTH_EMAIL_NOT_CONFIRMED: {
    status: 403,
    message: "Please confirm your email before signing in",
    logLevel: "warn",
  },
  AUTH_RATE_LIMITED: {
    status: 429,
    message: "Too many attempts. Please try again later",
    logLevel: "warn",
  },
  AUTH_UNAVAILABLE: {
    // Supabase is down, answered 5xx, or could not be reached.
    status: 503,
    message: "Authentication unavailable",
    logLevel: "error",
  },
  AUTH_LINK_INVALID: {
    // Email link (PKCE code or token hash) missing, expired or already used.
    status: 400,
    message: "This link is invalid or has expired. Please request a new one",
    logLevel: "warn",
  },
  AUTH_SESSION_MISSING: {
    status: 401,
    message: "Your session has expired. Please request a new link",
    logLevel: "warn",
  },
  AUTH_SIGNUP_FAILED: {
    status: 400,
    message: "Could not create account",
    logLevel: "warn",
  },
  AUTH_EMAIL_TAKEN: {
    // Deliberately reveals that the email has an account, for a clearer signup UX.
    status: 409,
    message: "Este email ya está registrado. Probá iniciando sesión",
    logLevel: "silent",
  },
  AUTH_SIGNOUT_FAILED: {
    status: 500,
    message: "Could not sign out",
    logLevel: "error",
  },
  AUTH_PASSWORD_UPDATE_FAILED: {
    // Supabase rejected the new password (weak, same as the old one...).
    status: 422,
    message: "Could not update password",
    logLevel: "warn",
  },

  // Calculator
  CALC_UNAVAILABLE: {
    status: 503,
    message: "Calculator unavailable",
    logLevel: "error",
  },
  CALC_COST_SUMMARY_FAILED: {
    // The pure engine rejected the persisted lines (invalid behavior,
    // traceability, amount or volume): a server-side data problem, not input.
    status: 500,
    message: "Could not compute the cost summary",
    logLevel: "error",
  },
  CALC_DRAFT_MISSING: {
    // The user has not saved paso 1, so there is no draft to attach costs to.
    status: 404,
    message: "Calculator draft not found",
    logLevel: "silent",
  },
  CALC_NOT_FOUND: {
    // Missing, foreign or non-uuid calculation id: all look the same.
    status: 404,
    message: "Calculation not found",
    logLevel: "silent",
  },
  CALC_COST_LINE_NOT_FOUND: {
    // Same code when the id is missing or belongs to another draft, so a
    // caller cannot tell those two cases apart.
    status: 404,
    message: "Cost line not found",
    logLevel: "silent",
  },
  CALC_SCENARIO_NOT_FOUND: {
    // Same code when the id is missing, not a uuid or belongs to another
    // draft, so a caller cannot tell those cases apart.
    status: 404,
    message: "Scenario not found",
    logLevel: "silent",
  },
  CALC_SCENARIO_LIMIT_REACHED: {
    // Step 7 compares the base with at most two alternatives.
    status: 409,
    message: "Scenario limit reached",
    logLevel: "silent",
  },
  CALC_SCENARIO_BASE_LOCKED: {
    // The base scenario is the calculation itself: it is never edited or
    // deleted from step 7.
    status: 409,
    message: "The base scenario cannot be changed",
    logLevel: "silent",
  },
  CALC_SCENARIO_INVALID_PRICE: {
    // A manual price of 0 has no margin to compare.
    status: 422,
    message: "The scenario price must be greater than 0",
    logLevel: "silent",
  },
  PRODUCT_NOT_FOUND: {
    // Missing, foreign or soft-deleted product id: all look the same.
    status: 404,
    message: "No encontramos ese producto.",
    logLevel: "silent",
  },
  SUPPLY_NOT_FOUND: {
    // Missing, foreign or non-uuid supply id: all look the same.
    status: 404,
    message: "Supply not found",
    logLevel: "silent",
  },
  COST_CATALOG_LINE_NOT_FOUND: {
    // Same code when the id is missing, not a uuid or belongs to another
    // owner's business, so a caller cannot tell those cases apart.
    status: 404,
    message: "Cost catalog line not found",
    logLevel: "silent",
  },
  SUPPLY_IN_USE: {
    // A recipe references the supply, so deleting it or changing its type/unit
    // would invalidate saved quantities.
    status: 409,
    message:
      "Ese insumo se usa en una o más recetas. Sacalo de todas las recetas que lo usan antes de borrarlo o cambiar su tipo o unidad.",
    logLevel: "silent",
  },
  SUPPLY_NOT_INGREDIENT: {
    // Packaging lives in the same catalog but can never be a recipe ingredient.
    status: 422,
    message: "El packaging no se puede usar como ingrediente.",
    logLevel: "silent",
  },

  // Suppliers (supply tenders, docs/licitaciones RN-22 and RN-23)
  SUPPLIER_INVITE_INVALID: {
    // Unknown, already used or expired link: all look the same.
    status: 410,
    message:
      "Este enlace de invitación ya no sirve: puede haber vencido o ya se usó. Pedile uno nuevo a quien te invitó.",
    logLevel: "silent",
  },
  SUPPLIER_INVITE_OWN: {
    status: 422,
    message: "Este enlace lo generaste vos: mandáselo al proveedor para que se registre.",
    logLevel: "silent",
  },
  SUPPLIER_CUIT_TAKEN: {
    // RN-23: an existing CUIT never gets a second account.
    status: 409,
    message:
      "Ese CUIT ya tiene una cuenta de proveedor. Ingresá con esa cuenta y abrí de nuevo el enlace para quedar vinculado.",
    logLevel: "silent",
  },
  SUPPLIER_ALREADY_REGISTERED: {
    status: 409,
    message: "Tu cuenta ya tiene datos de proveedor.",
    logLevel: "silent",
  },
  SUPPLIER_REQUIRED: {
    status: 403,
    message: "Esta sección es solo para proveedores.",
    logLevel: "silent",
  },

  // Supply tenders (docs/licitaciones)
  TENDER_NOT_FOUND: {
    // Missing, foreign or non-uuid tender id: all look the same.
    status: 404,
    message: "No encontramos esa licitación.",
    logLevel: "silent",
  },
  TENDER_ACTIVE_EXISTS: {
    // RN-03: this version handles one active tender at a time.
    status: 409,
    message:
      "Ya tenés una licitación en curso. Por ahora puede haber una sola por vez: esperá a que cierre o cancelala.",
    logLevel: "silent",
  },
  TENDER_SUPPLY_NOT_FOUND: {
    // RN-01: only supplies of the emprendedor's own catalog.
    status: 422,
    message: "Uno de los insumos ya no está en tu catálogo. Recargá la página y elegilos de nuevo.",
    logLevel: "silent",
  },
  TENDER_SUPPLIER_NOT_LINKED: {
    // RN-05: only suppliers registered with this emprendedor.
    status: 422,
    message: "Uno de los proveedores elegidos no está registrado con vos. Recargá la página y elegilos de nuevo.",
    logLevel: "silent",
  },
  TENDER_NOT_ACTIVE: {
    // RN-12: closed or cancelled tenders accept nothing that needs it open.
    status: 409,
    message: "La licitación ya cerró o fue cancelada.",
    logLevel: "silent",
  },
  TENDER_NOT_CLOSED: {
    status: 409,
    message: "Esto se puede hacer cuando cierre la licitación.",
    logLevel: "silent",
  },
  TENDER_NO_OFFER: {
    // RN-14 and RN-21 act on suppliers that offered for the item.
    status: 422,
    message: "Ese proveedor no ofertó por ese insumo.",
    logLevel: "silent",
  },
  TENDER_ORDER_EXISTS: {
    // RN-15/RN-17: an issued purchase order is final.
    status: 409,
    message: "Ya generaste la orden de compra para ese proveedor: lo que tiene la orden no se puede cambiar.",
    logLevel: "silent",
  },
  TENDER_NOTHING_AWARDED: {
    status: 422,
    message: "Primero elegí a ese proveedor para al menos un insumo.",
    logLevel: "silent",
  },

  // Knowledge search (chat-datos, #279). No route reads it until stage 3.
  KNOWLEDGE_UNAVAILABLE: {
    status: 503,
    message: "La búsqueda de documentos no está disponible.",
    logLevel: "error",
  },

  // Read-only SQL for the chat agent (chat-datos, #279). The model, not the
  // user, writes the query: `details.reason` tells the model what to fix and
  // is not meant for the screen. Nothing reads these codes until stage 3.
  ANALYST_QUERY_REJECTED: {
    status: 422,
    message: "La consulta no está permitida.",
    logLevel: "silent",
  },
  ANALYST_QUERY_FAILED: {
    status: 422,
    message: "La consulta no se pudo ejecutar.",
    logLevel: "silent",
  },
  ANALYST_QUERY_TIMEOUT: {
    status: 504,
    message: "La consulta tardó demasiado.",
    logLevel: "warn",
  },
} as const satisfies Record<string, CatalogEntry>;

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
