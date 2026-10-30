import type { SupabaseClient } from "@supabase/supabase-js";

export type RemoteLogoutOutcome = "confirmed" | "failed" | "indeterminate";

const outcomes = new WeakMap<object, () => RemoteLogoutOutcome>();

function isLogoutRequest(input: RequestInfo | URL, init?: RequestInit) {
  let urlString: string;
  if (typeof input === "string") {
    urlString = input;
  } else if (input instanceof URL) {
    urlString = input.href;
  } else {
    urlString = input.url ?? "";
  }
  const url = new URL(urlString);
  const method = init?.method ?? (input as { method?: string }).method ?? "GET";

  return method === "POST" && url.pathname.endsWith("/auth/v1/logout");
}

// The SDK can replace a remote logout error with a later storage exception.
// Observe only the logout response status, never its body or headers.
export function createLogoutOutcomeTracker(fetcher: typeof fetch = globalThis.fetch) {
  let outcome: RemoteLogoutOutcome = "indeterminate";

  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const isLogout = isLogoutRequest(input, init);

      try {
        const response = await fetcher(input, init);
        if (isLogout) outcome = response.ok ? "confirmed" : "failed";
        return response;
      } catch (error) {
        if (isLogout) outcome = "indeterminate";
        throw error;
      }
    },
    getOutcome: () => outcome,
  };
}

export function attachLogoutOutcome(client: SupabaseClient, getOutcome: () => RemoteLogoutOutcome) {
  outcomes.set(client, getOutcome);
}

export function getLogoutOutcome(client: SupabaseClient): RemoteLogoutOutcome | undefined {
  return outcomes.get(client)?.();
}
