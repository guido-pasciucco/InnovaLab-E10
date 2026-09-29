"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setStatus("error");
        setErrorMessage(data?.error ?? "Could not send reset email.");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Could not connect to the server. Please try again.");
    }
  }

  const isLoading = status === "loading";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isLoading}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
        />
      </div>

      {status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      {status === "success" && (
        <p role="status" className="text-sm text-green-600">
          If an account exists for that email, a reset link has been sent.
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {isLoading ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}
