"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { passwordUpdateSchema } from "@/lib/schemas/auth/auth";
import { passwordField } from "@/lib/schemas/auth/fields";
import { updatePassword } from "./actions";
import { type PasswordUpdateState } from "@/lib/types/auth";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import type { Path } from "react-hook-form";

const initialState: PasswordUpdateState = undefined;

// Client-side extension of the shared schema: the confirm-match check
// lives only in the form (the service validates the password itself).
// confirm reuses passwordField so both inputs always share the same rule.
const updatePasswordFormSchema = passwordUpdateSchema
  .extend({ confirm: passwordField })
  .refine((values) => values.password === values.confirm, {
    error: "Passwords do not match.",
    path: ["confirm"],
  });

type UpdatePasswordFormValues = z.infer<typeof updatePasswordFormSchema>;

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<UpdatePasswordFormValues>[] = ["password"];

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [state, submitAction, pending] = useActionState(updatePassword, initialState);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordFormSchema),
  });

  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);

  useEffect(() => {
    if (state?.ok) {
      router.push("/login");
      router.refresh();
    }
  }, [state, router]);

  return (
    // RHF validates in the client (schema + confirm match); only then it
    // dispatches the password alone to the action (transition-wrapped).
    <form
      onSubmit={handleSubmit((values) =>
        dispatchInTransition(submitAction)({ password: values.password }),
      )}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          New password
        </label>
        <input
          {...register("password")}
          id="password"
          type="password"
          autoComplete="new-password"
          disabled={pending}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
        />
        {errors.password && (
          <p role="alert" className="text-sm text-red-600">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirm" className="text-sm font-medium text-gray-700">
          Confirm password
        </label>
        <input
          {...register("confirm")}
          id="confirm"
          type="password"
          autoComplete="new-password"
          disabled={pending}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
        />
        {errors.confirm && (
          <p role="alert" className="text-sm text-red-600">
            {errors.confirm.message}
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
          Password updated. Redirecting to sign in…
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {pending ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
