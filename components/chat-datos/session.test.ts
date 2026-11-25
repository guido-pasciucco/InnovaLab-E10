import { describe, expect, it } from "vitest";

import { readChatSession, writeChatSession } from "./session";

function memoryStore() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

const message = {
  id: "1",
  role: "user" as const,
  parts: [{ type: "text" as const, text: "Hola" }],
};

describe("chat session", () => {
  it("round-trips the messages of this tab", () => {
    const store = memoryStore();

    writeChatSession([message], store);

    expect(readChatSession(store)).toEqual([message]);
  });

  it("drops a stored value that is not a conversation", () => {
    const objectStore = memoryStore();
    objectStore.setItem("chat-datos.session", JSON.stringify({ nope: true }));
    expect(readChatSession(objectStore)).toEqual([]);

    const brokenStore = memoryStore();
    brokenStore.setItem("chat-datos.session", "no es json");
    expect(readChatSession(brokenStore)).toEqual([]);
  });

  it("ignores entries that are not chat messages", () => {
    const store = memoryStore();
    store.setItem("chat-datos.session", JSON.stringify([message, { role: "system", parts: [] }]));

    expect(readChatSession(store)).toEqual([message]);
  });
});
