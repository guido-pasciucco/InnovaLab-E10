// Login result in domain terms — no HTTP status, no Response.
// New code/message/details follow ServiceResult (see lib/api/error-catalog);
// legacy reason/error aliases stay during migration so existing form
// consumers (state.error) keep typechecking until they move to code/message.
import type { ErrorCode } from "@/lib/api/error-catalog";

export type LoginReason = "validation" | "credentials" | "unavailable";

export type LoginResult =
  | { ok: true; data: Record<string, never> }
  | {
      ok: false;
      code: ErrorCode;
      reason: LoginReason;
      message: string;
      error: string;
      details?: unknown;
    };

// Estado del form de login para useActionState.
// El inicial es undefined (todavía no se envió nada).
export type LoginState = LoginResult | undefined;
