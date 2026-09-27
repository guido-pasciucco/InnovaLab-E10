"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signupSchema } from "@/lib/schemas/auth/auth";
import { signup } from "./actions";
import { type SignupState } from "@/lib/types/auth";
import { dispatchInTransition } from "@/components/forms/dispatch-in-transition";
import { useServerFieldErrors } from "@/components/forms/use-server-field-errors";
import type { Path } from "react-hook-form";

const initialState: SignupState = undefined;

// Types come from the shared schema (single source): if the schema
// changes, the form follows on its own.
type SignupFormValues = z.infer<typeof signupSchema>;

// Fields the server may flag; module-level so the reference stays stable.
const SERVER_FIELDS: readonly Path<SignupFormValues>[] = ["displayName", "email", "password"];

export default function SignupForm() {
  const router = useRouter();
  const [state, submitAction, pending] = useActionState(signup, initialState);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const hasServerFieldErrors = useServerFieldErrors(state, setError, SERVER_FIELDS);

  useEffect(() => {
    if (state?.ok) {
      router.push("/login");
      router.refresh();
    }
  }, [state, router]);

  return (
    // RHF validates in the client with the same schema; only then it
    // dispatches to the action (wrapped in a transition by the helper).
    <form onSubmit={handleSubmit(dispatchInTransition(submitAction))} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          {...register("displayName")}
          id="displayName"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          disabled={pending}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
        />
        {errors.displayName && (
          <p role="alert" className="text-sm text-red-600">
            {errors.displayName.message}
          </p>
        )}
      </div>

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

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Password
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
        <p className="text-xs text-gray-500">Minimum 8 characters.</p>
      </div>

      {state && !state.ok && !hasServerFieldErrors && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      {state?.ok && (
        <p role="status" className="text-sm text-green-600">
          Account created. Please check your email if confirmation is required.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
