import { unstable_rethrow } from "next/navigation";
import { toAppError } from "./app-error";
import {
  failResult,
  okResult,
  type ErrorCode,
  type ServiceResult,
} from "./catalog";

// Server Action door: runs a throwing service call and returns a
// serializable ServiceResult for useActionState. Actions never throw
// to the client (Next masks error messages in production).
export function handleActionErrors<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
  fallbackCode: ErrorCode = "INTERNAL",
): (...args: A) => Promise<ServiceResult<T>> {
  return async (...args) => {
    try {
      return okResult(await fn(...args));
    } catch (err) {
      // redirect()/notFound() work by throwing; let them through.
      unstable_rethrow(err);
      const appError = toAppError(err, fallbackCode);
      return failResult(appError.code, appError.details);
    }
  };
}
