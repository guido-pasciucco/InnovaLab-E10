"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "./actions";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogout() {
    setLoading(true);
    setErrorMessage("");

    // The action returns the result (never throws to the client), so
    // sign-out failures can be shown inline instead of navigating blindly.
    // The call itself can still reject (offline, deploy in progress):
    // that must re-enable the button instead of leaving it stuck.
    let result: Awaited<ReturnType<typeof logout>>;
    try {
      result = await logout();
    } catch {
      setLoading(false);
      setErrorMessage("Could not sign out. Check your connection and try again.");
      return;
    }

    if (!result.ok) {
      setLoading(false);
      setErrorMessage(result.message);
      return;
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:bg-gray-400"
      >
        {loading ? "Signing out..." : "Sign out"}
      </button>
      {errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
