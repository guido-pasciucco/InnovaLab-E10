import {
  HELP_THREAD_LIMIT,
  HELP_VISIBLE_THREAD_LIMIT,
  type HelpMessage,
} from "@/lib/schemas/help/help";

// The chat keeps two independent windows over the same thread:
//
// - visible: what the person reads and what we persist in sessionStorage,
//   capped by HELP_VISIBLE_THREAD_LIMIT so nothing disappears after six
//   messages.
// - context: the last HELP_THREAD_LIMIT messages actually sent to the model,
//   capped again by the API schema. Older answers stay on screen even when
//   they are no longer sent as context.

// Appends the new question to the visible history.
export function appendUserMessage(
  thread: HelpMessage[],
  content: string,
): HelpMessage[] {
  return [
    ...thread,
    { role: "user" as const, content },
  ].slice(-HELP_VISIBLE_THREAD_LIMIT);
}

// The reduced context for the API: only the last turn window.
export function toModelContext(thread: HelpMessage[]): HelpMessage[] {
  return thread.slice(-HELP_THREAD_LIMIT);
}

// Opens the assistant turn while streaming, without dropping visible history.
export function appendAssistantTurn(
  thread: HelpMessage[],
): HelpMessage[] {
  return [
    ...thread,
    { role: "assistant" as const, content: "" },
  ].slice(-HELP_VISIBLE_THREAD_LIMIT);
}

// Writes a streaming snapshot into the last assistant turn. Any other shape
// (no assistant turn open, stale update) leaves the thread untouched.
export function withAssistantSnapshot(thread: HelpMessage[], content: string): HelpMessage[] {
  const last = thread.at(-1);
  if (last?.role !== "assistant") return thread;
  return [...thread.slice(0, -1), { role: "assistant", content }];
}
