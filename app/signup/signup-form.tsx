"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "success" | "error";

export default function SignupForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const trimmedDisplayName = displayName.trim();
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(trimmedDisplayName ? { displayName: trimmedDisplayName } : {}),
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setStatus("error");
        setErrorMessage(data?.error ?? "Could not create account. Please try again.");
        return;
      }

      setStatus("success");
      // If email confirmation is disabled, session is active and user is logged in.
      // Otherwise user must confirm via email before login.
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
        <label htmlFor="displayName" className="text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="displayName"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          disabled={isLoading}
          className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
        />
      </div>

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

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Password
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
        <p className="text-xs text-gray-500">Minimum 8 characters.</p>
      </div>

      {status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      {status === "success" && (
        <p role="status" className="text-sm text-green-600">
          Account created. Please check your email if confirmation is required.
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {isLoading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
