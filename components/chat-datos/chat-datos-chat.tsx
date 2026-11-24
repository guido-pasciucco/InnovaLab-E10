"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { FormBanner } from "@/components/ui/page-shell";
import { CHAT_DATOS_MAX_QUESTION_CHARS } from "@/lib/chat-datos/request";

import { Answer } from "./answer";
import { buildChatRequestBody, describeChatError, messageText, toAnswerView } from "./messages";
import { readChatSession, writeChatSession } from "./session";

const SUGGESTIONS = [
  "¿Cuántos productos tengo cargados?",
  "¿Qué insumos son los más caros?",
  "¿Cuáles son mis gastos del negocio?",
  "¿Cómo se calcula el punto de equilibrio?",
];

// The transport sends the new question and the history of finished pairs. The
// signed-in user is not in the body: the server reads it from the session.
const transport = new DefaultChatTransport({
  api: "/api/chat-datos",
  prepareSendMessagesRequest: ({ messages }) => ({ body: buildChatRequestBody(messages) }),
});

const composerClass =
  "flex w-full items-end gap-2 rounded-[28px] border border-border-default bg-surface px-2 py-2 shadow-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus";

export function ChatDatosChat() {
  const { messages, sendMessage, setMessages, status, error, clearError } = useChat({
    id: "chat-datos",
    transport,
  });
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLLIElement>(null);
  const hydrated = useRef(false);
  const cleared = useRef(false);

  const busy = status === "submitted" || status === "streaming";
  const errorText = describeChatError(error);
  const lastMessage = messages[messages.length - 1];
  const waiting = status === "submitted" || (busy && lastMessage?.role === "user");
  const empty = messages.length === 0;

  // Restore before paint, so coming back does not flash the empty greeting.
  // The write waits until that restore has landed, so the first empty render
  // does not erase the saved conversation.
  useLayoutEffect(() => {
    const stored = readChatSession();
    if (stored.length > 0) setMessages(stored);
    hydrated.current = true;
  }, [setMessages]);

  useEffect(() => {
    if (!hydrated.current) return;
    if (empty && !cleared.current && readChatSession().length > 0) return;
    writeChatSession(messages);
  }, [empty, messages]);

  useEffect(() => {
    const list = endRef.current?.parentElement;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, waiting]);

  function ask(question: string) {
    const text = question.trim();
    if (text === "" || busy) return;
    clearError();
    setInput("");
    void sendMessage({ text });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ask(input);
    }
  }

  function reset() {
    clearError();
    cleared.current = true;
    setMessages([]);
    writeChatSession([]);
  }

  const composer = (
    <form onSubmit={handleSubmit} className="w-full space-y-2 pr-16">
      <FormBanner message={errorText} />
      <div className={composerClass}>
        <textarea
          aria-label="Tu pregunta"
          value={input}
          rows={1}
          maxLength={CHAT_DATOS_MAX_QUESTION_CHARS}
          autoComplete="off"
          placeholder="Escribí tu pregunta"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-3 py-2.5 text-base text-fg outline-none placeholder:text-fg-muted"
        />
        <button
          type="submit"
          disabled={busy || input.trim() === ""}
          className="mb-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-action-primary text-sm font-semibold text-on-action-primary hover:bg-action-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:bg-action-disabled disabled:text-fg-disabled"
        >
          {busy ? "…" : "Enviar"}
        </button>
      </div>
      {!empty && (
        <button
          type="button"
          onClick={reset}
          disabled={busy}
          className="inline-flex min-h-11 items-center rounded-[14px] px-3 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:text-fg-disabled"
        >
          Nueva conversación
        </button>
      )}
    </form>
  );

  return (
    <section aria-label="Chat con tus datos" className="flex h-[calc(100dvh-4.5rem)] min-h-0 flex-col">
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10">
          <div className="max-w-xl space-y-2 text-center">
            <p className="text-3xl font-semibold text-fg">Hola, ¿qué querés saber?</p>
            <p className="text-base text-fg-muted">
              Preguntame por tus productos, insumos y gastos, o cómo funciona la calculadora. Es una
              herramienta en prueba: revisá los números importantes.
            </p>
          </div>
          <ul className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Preguntas de ejemplo">
            {SUGGESTIONS.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => ask(suggestion)}
                  className="flex min-h-16 w-full cursor-pointer items-center rounded-2xl border border-border-default bg-surface px-4 py-3 text-left text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
          {composer}
        </div>
      ) : (
        <>
          <ol role="log" aria-live="polite" aria-label="Conversación" className="min-h-0 flex-1 space-y-6 overflow-y-auto py-6">
            {messages.map((message, index) => (
              <li key={message.id} className={message.role === "user" ? "flex justify-end" : undefined}>
                {message.role === "user" ? (
                  <p className="max-w-[85%] rounded-3xl bg-action-primary px-4 py-3 text-base whitespace-pre-wrap text-on-action-primary">
                    {messageText(message)}
                  </p>
                ) : (
                  <div className="max-w-full">
                    <Answer view={toAnswerView(message)} finished={!(busy && index === messages.length - 1)} />
                  </div>
                )}
              </li>
            ))}
            {waiting && (
              <li role="status" className="text-sm text-fg-muted">
                Pensando…
              </li>
            )}
            <li ref={endRef} aria-hidden="true" />
          </ol>
          <div className="shrink-0 bg-surface-tint pt-2 pb-4">{composer}</div>
        </>
      )}
    </section>
  );
}
