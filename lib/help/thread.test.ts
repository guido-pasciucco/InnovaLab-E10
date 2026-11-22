
import { describe, expect, it } from "vitest";

import {
  HELP_THREAD_LIMIT,
  HELP_VISIBLE_THREAD_LIMIT,
  type HelpMessage,
} from "@/lib/schemas/help/help";
import {
  appendAssistantTurn,
  appendUserMessage,
  toModelContext,
  withAssistantSnapshot,
} from "./thread";
import {
  helpThreadStorageKey,
  readHelpThread,
  writeHelpThread,
} from "./client-session";

function makeThread(count: number): HelpMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    role: index % 2 === 0 ? "user" as const : "assistant" as const,
    content: `Mensaje ${index + 1}`,
  }));
}

function makeStorage() {
  const data = new Map<string, string>();

  return {
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}

describe("Mora — historial visible", () => {
  it("conserva ocho mensajes anteriores", () => {
    const messages = appendUserMessage(makeThread(8), "Nueva pregunta");

    expect(messages).toHaveLength(9);
    expect(messages[0].content).toBe("Mensaje 1");
    expect(messages.at(-1)).toEqual({
      role: "user",
      content: "Nueva pregunta",
    });
  });

  it("conserva hasta 100 mensajes visibles", () => {
    const messages = makeThread(HELP_VISIBLE_THREAD_LIMIT);

    expect(messages).toHaveLength(100);
    expect(messages[0].content).toBe("Mensaje 1");
  });

  it("limita el historial visible a 100 mensajes", () => {
    const messages = appendUserMessage(
      makeThread(HELP_VISIBLE_THREAD_LIMIT),
      "Mensaje 101",
    );

    expect(messages).toHaveLength(HELP_VISIBLE_THREAD_LIMIT);
    expect(messages[0].content).toBe("Mensaje 2");
    expect(messages.at(-1)?.content).toBe("Mensaje 101");
  });

  it("agrega la respuesta sin descartar los mensajes anteriores", () => {
    const initial = makeThread(8);
    const messages = appendAssistantTurn(initial);

    expect(messages).toHaveLength(9);
    expect(messages.slice(0, 8)).toEqual(initial);
    expect(messages.at(-1)).toEqual({
      role: "assistant",
      content: "",
    });
  });
});

describe("Mora — contexto de Bedrock", () => {
  it("envía únicamente los últimos seis mensajes", () => {
    const visible = makeThread(10);
    const context = toModelContext(visible);

    expect(context).toHaveLength(HELP_THREAD_LIMIT);
    expect(context[0].content).toBe("Mensaje 5");
    expect(context.at(-1)?.content).toBe("Mensaje 10");
    expect(visible).toHaveLength(10);
  });

  it("no altera un contexto menor a seis mensajes", () => {
    const visible = makeThread(4);

    expect(toModelContext(visible)).toEqual(visible);
  });
});

describe("Mora — streaming", () => {
  it("actualiza solo la última respuesta", () => {
    const initial = appendAssistantTurn(makeThread(7));
    const updated = withAssistantSnapshot(initial, "Respuesta parcial");
    const completed = withAssistantSnapshot(updated, "Respuesta completa");

    expect(completed).toHaveLength(8);
    expect(completed.slice(0, 7)).toEqual(makeThread(7));
    expect(completed.at(-1)?.content).toBe("Respuesta completa");
    expect(initial.at(-1)?.content).toBe("");
  });

  it("ignora snapshots cuando no hay respuesta abierta", () => {
    const messages = makeThread(7);

    expect(withAssistantSnapshot(messages, "No corresponde")).toBe(messages);
  });
});

describe("Mora — almacenamiento por usuario", () => {
  it("usa claves distintas para cuentas distintas", () => {
    expect(helpThreadStorageKey("usuario-a")).not.toBe(
      helpThreadStorageKey("usuario-b"),
    );
  });

  it("no mezcla el historial de dos usuarios", () => {
    const storage = makeStorage();

    const historyA: HelpMessage[] = [
      { role: "user", content: "Pregunta privada A" },
    ];
    const historyB: HelpMessage[] = [
      { role: "user", content: "Pregunta privada B" },
    ];

    writeHelpThread(storage, "usuario-a", historyA);
    writeHelpThread(storage, "usuario-b", historyB);

    expect(readHelpThread(storage, "usuario-a")).toEqual(historyA);
    expect(readHelpThread(storage, "usuario-b")).toEqual(historyB);
    expect(readHelpThread(storage, "usuario-c")).toEqual([]);
  });

  it("persiste más de seis mensajes en sessionStorage", () => {
    const storage = makeStorage();
    const messages = makeThread(12);

    writeHelpThread(storage, "usuario-a", messages);

    expect(readHelpThread(storage, "usuario-a")).toEqual(messages);
  });

  it("aplica el límite visible al recuperar el historial", () => {
    const storage = makeStorage();

    writeHelpThread(storage, "usuario-a", makeThread(105));

    const restored = readHelpThread(storage, "usuario-a");

    expect(restored).toHaveLength(100);
    expect(restored[0].content).toBe("Mensaje 6");
    expect(restored.at(-1)?.content).toBe("Mensaje 105");
  });
});
