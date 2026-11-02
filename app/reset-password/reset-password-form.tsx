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

// Types come from the shared schema (single source). The redirect origin
// for the email link is resolved on the server, never sent from here.
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
    <form onSubmit={handleSubmit(dispatchInTransition(submitAction))} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-fg-muted">
          Email
        </label>
        <input
          {...register("email")}
          id="email"
          type="email"
          autoComplete="email"
          disabled={pending}
          className="rounded-md border border-border-control px-3 py-2 text-fg disabled:bg-surface-tint"
        />
        {errors.email && (
          <p role="alert" className="text-sm text-danger">
            {errors.email.message}
          </p>
        )}
      </div>

      {state && !state.ok && !hasServerFieldErrors && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      {state?.ok && (
        <p role="status" className="text-sm text-success">
          If an account exists for that email, a reset link has been sent.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-action-primary px-4 py-2 font-medium text-on-action-primary hover:bg-action-primary-hover disabled:bg-action-disabled disabled:text-fg-disabled"
      >
        {pending ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}
