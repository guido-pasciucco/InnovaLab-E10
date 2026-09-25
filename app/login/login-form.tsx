"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "success" | "error";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setStatus("error");
        setErrorMessage("Credenciales inválidas. Verifique sus datos e intente nuevamente.");
        return;
      }

      setStatus("success");
      router.push("/");
      router.refresh();
    } catch {
      setStatus("error");
      setErrorMessage("No fue posible conectar con el servidor. Intente nuevamente.");
    }
  }

  const isLoading = status === "loading";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Correo electrónico
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
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
          Sesión iniciada correctamente. Redirigiendo…
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {isLoading ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
