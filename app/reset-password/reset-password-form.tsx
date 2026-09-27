"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { passwordResetRequestSchema } from "@/lib/schemas/auth/auth";
import { requestPasswordReset } from "./actions";
import { type PasswordResetState } from "@/lib/types/auth";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import type { Path } from "react-hook-form";

const initialState: PasswordResetState = undefined;

// Types come from the shared schema (single source). The action also
// needs the client origin for the email redirect target; it is attached
// at dispatch time because actions have no Request.url.
type ResetFormValues = z.infer<typeof passwordResetRequestSchema>;

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<ResetFormValues>[] = ["email"];

export default function ResetPasswordForm() {
  const [state, submitAction, pending] = useActionState(requestPasswordReset, initialState);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(passwordResetRequestSchema),
  });

  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);

  return (
    // RHF validates in the client with the same schema; only then it
    // dispatches to the action (wrapped in a transition by the helper).
    <form
      onSubmit={handleSubmit((values) =>
        dispatchInTransition(submitAction)({ ...values, origin: window.location.origin }),
      )}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          {...register("email")}
          id="email"
          type="email"
          autoComplete="email"
          disabled={pending}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
        />
        {errors.email && (
          <p role="alert" className="text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      {state && !state.ok && !hasServerFieldErrors && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      {state?.ok && (
        <p role="status" className="text-sm text-green-600">
          If an account exists for that email, a reset link has been sent.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {pending ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}
