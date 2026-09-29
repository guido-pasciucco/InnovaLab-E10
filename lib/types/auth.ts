import type { ServiceResult } from "@/lib/errors/catalog";

// Login form state for useActionState.
// The initial value is undefined (nothing submitted yet).
export type LoginState = ServiceResult<Record<string, never>> | undefined;

// Signup form state for useActionState.
export type SignupState = ServiceResult<Record<string, never>> | undefined;

// Password reset request form state for useActionState.
// Success is always generic to prevent account enumeration.
export type PasswordResetState = ServiceResult<Record<string, never>> | undefined;

// Password update form state for useActionState.
export type PasswordUpdateState = ServiceResult<Record<string, never>> | undefined;
