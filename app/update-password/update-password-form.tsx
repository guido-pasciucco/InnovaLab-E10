"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "success" | "error";

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirm) {
      setStatus("error");
      setErrorMessage("Passwords do not match.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setStatus("error");
        setErrorMessage(data?.error ?? "Could not update password.");
        return;
      }

      setStatus("success");
      router.push("/login");
      router.refresh();
    } catch {
      setStatus("error");
      setErrorMessage("Could not connect to the server. Please try again.");
    }
  }

  const isLoading = status === "loading";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          New password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirm" className="text-sm font-medium text-gray-700">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
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
          Password updated. Redirecting to sign in...
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {isLoading ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
