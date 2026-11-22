import { HELP_VISIBLE_THREAD_LIMIT, type HelpMessage } from "@/lib/schemas/help/help";

const STORAGE_KEY_PREFIX = "numora-ayuda";

export function helpThreadStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

export function readHelpThread(storage: Pick<Storage, "getItem">, userId: string): HelpMessage[] {
  try {
    const stored = storage.getItem(helpThreadStorageKey(userId));
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is HelpMessage =>
          !!item &&
          typeof item === "object" &&
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string",
      )
      // Visible history, not model context: the whole session stays readable
      // (see HELP_VISIBLE_THREAD_LIMIT). The API only ever receives the last
      // HELP_THREAD_LIMIT messages, sliced at request time.
      .slice(-HELP_VISIBLE_THREAD_LIMIT);
  } catch {
    return [];
  }
}

export function writeHelpThread(
  storage: Pick<Storage, "setItem">,
  userId: string,
  messages: HelpMessage[],
): void {
  storage.setItem(
    helpThreadStorageKey(userId),
    JSON.stringify(messages.slice(-HELP_VISIBLE_THREAD_LIMIT)),
  );
}

export function createHelpRequestGuard() {
  let generation = 0;
  let active: AbortController | null = null;

  return {
    invalidate() {
      generation += 1;
      active?.abort();
      active = null;
    },
    start() {
      active?.abort();
      const controller = new AbortController();
      active = controller;
      const requestGeneration = generation;
      return {
        controller,
        isCurrent: () => active === controller && generation === requestGeneration,
        finish: () => {
          if (active === controller) active = null;
        },
      };
    },
  };
}
