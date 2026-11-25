import type { UIMessage } from "ai";

// The chat lives in this browser tab only. Closing the tab drops it.
const STORAGE_KEY = "chat-datos.session";

type SessionStore = Pick<Storage, "getItem" | "setItem">;

function isMessage(value: unknown): value is UIMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as { id?: unknown; role?: unknown; parts?: unknown };
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    Array.isArray(message.parts)
  );
}

export function readChatSession(store: SessionStore | null = browserStore()): UIMessage[] {
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMessage);
  } catch {
    return [];
  }
}

export function writeChatSession(messages: readonly UIMessage[], store: SessionStore | null = browserStore()): void {
  if (!store) return;
  store.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function browserStore(): SessionStore | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}
