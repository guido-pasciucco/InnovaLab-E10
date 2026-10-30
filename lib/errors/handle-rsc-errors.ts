import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { AppError, toAppError } from "./app-error";
import type { ErrorCode } from "./catalog";

// RSC read door: wraps a server-component read. The value flows back
// untouched; failures are logged per the catalog and always re-thrown
// so the segment error boundary (error.tsx) renders them. It never
// absorbs errors.
//
// A ZodError here is not user input: it means a persisted row violated
// its schema (e.g. getCalculatorSetupService), so it is reclassified as
// infrastructure with the fallback code — never as the silent VALIDATION.
export async function handleRscErrors<T>(
  fn: () => Promise<T>,
  fallbackCode: ErrorCode = "INTERNAL",
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // redirect()/notFound() work by throwing; let them through.
    unstable_rethrow(err);
    if (err instanceof ZodError) {
      throw toAppError(new AppError(fallbackCode, undefined, { cause: err }));
    }
    throw toAppError(err, fallbackCode);
  }
}
