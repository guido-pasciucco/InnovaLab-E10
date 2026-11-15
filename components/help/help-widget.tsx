"use client";

import { MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HELP_THREAD_LIMIT, type HelpMessage } from "@/lib/schemas/help/help";

const STORAGE_KEY = "numora-ayuda";

type HelpWidgetProps = {
  enabled: boolean;
};

function readThread(): HelpMessage[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
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
      .slice(-HELP_THREAD_LIMIT);
  } catch {
    return [];
  }
}

export function HelpWidget({ enabled }: HelpWidgetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !loadedRef.current) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-HELP_THREAD_LIMIT)));
  }, [enabled, messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  if (!enabled) return null;

  async function send() {
    const content = draft.trim();
    if (!content || pending) return;

    const next = [...messages, { role: "user" as const, content }].slice(-HELP_THREAD_LIMIT);
    setMessages(next);
    setDraft("");
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/help", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!response.ok || !response.body) {
        setError(
          response.status === 401
            ? "Iniciá sesión para preguntar."
            : "No pude obtener una respuesta. Probá de nuevo.",
        );
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      setMessages((current) =>
        [...current, { role: "assistant" as const, content: "" }].slice(-HELP_THREAD_LIMIT),
      );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        const snapshot = answer;
        setMessages((current) => {
          const updated = [...current];
          const last = updated.at(-1);
          if (last?.role !== "assistant") return current;
          updated[updated.length - 1] = { role: "assistant", content: snapshot };
          return updated;
        });
      }
    } catch {
      setError("No pude obtener una respuesta. Probá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
      {open ? (
        <section
          aria-label="Ayuda de la aplicación"
          className="flex h-[28rem] w-[min(24rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-border-default bg-surface shadow-lg"
        >
          <header className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <h2 className="text-base font-semibold text-fg">Ayuda</h2>
            <button
              type="button"
              className="rounded-full p-1 text-fg-muted hover:text-fg"
              aria-label="Cerrar ayuda"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" size={18} />
            </button>
          </header>
          <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <p className="text-sm text-fg-muted">
                Preguntame qué hace la aplicación, qué significa un término o qué beneficio te da.
              </p>
            ) : null}
            {messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={
                  message.role === "user"
                    ? "max-w-[85%] self-end rounded-2xl bg-action-primary px-3 py-2 text-sm text-on-action-primary"
                    : "max-w-[85%] self-start rounded-2xl bg-surface-tint px-3 py-2 text-sm text-fg"
                }
              >
                {message.content || (pending ? "…" : "")}
              </p>
            ))}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
          <form
            className="flex gap-2 border-t border-border-default p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <label className="sr-only" htmlFor="help-question">
              Pregunta
            </label>
            <input
              id="help-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={pending}
              placeholder="Escribí tu pregunta"
              className="min-h-11 flex-1 rounded-[14px] border border-border-control bg-surface px-3 text-sm text-fg"
            />
            <button
              type="submit"
              disabled={pending || draft.trim().length === 0}
              className="min-h-11 rounded-[14px] bg-action-primary px-4 text-sm font-semibold text-on-action-primary disabled:cursor-not-allowed disabled:bg-action-disabled disabled:text-fg-disabled"
            >
              Enviar
            </button>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-action-primary text-on-action-primary shadow-lg"
        aria-expanded={open}
        aria-label={open ? "Cerrar ayuda" : "Abrir ayuda"}
        onClick={() => {
          if (!open) {
            loadedRef.current = true;
            setMessages(readThread());
          }
          setOpen((value) => !value);
        }}
      >
        {open ? <X aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
      </button>
    </div>
  );
}
