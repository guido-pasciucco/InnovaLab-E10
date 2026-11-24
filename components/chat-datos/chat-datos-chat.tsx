"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { FormBanner } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { CHAT_DATOS_MAX_QUESTION_CHARS } from "@/lib/chat-datos/request";

import { Answer } from "./answer";
import { buildChatRequestBody, describeChatError, messageText, toAnswerView } from "./messages";

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

export function ChatDatosChat() {
  const { messages, sendMessage, setMessages, status, error, clearError } = useChat({ transport });
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const busy = status === "submitted" || status === "streaming";
  const errorText = describeChatError(error);
  const lastMessage = messages[messages.length - 1];
  // The question went out and nothing has come back yet.
  const waiting = status === "submitted" || (busy && lastMessage?.role === "user");

  // Scrolls when a message is added, not on every streamed chunk: a person
  // reading the top of a long answer is not pulled to the bottom.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

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

  function reset() {
    clearError();
    setMessages([]);
  }

  return (
    <section aria-label="Chat con tus datos" className="space-y-6">
      {messages.length === 0 ? (
        <div className="space-y-4 rounded-3xl bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-base text-fg">
            Preguntame por tus productos, insumos, gastos y cálculos, o cómo funciona la calculadora.
            Respondo con los datos de tu negocio. Es una herramienta en prueba: revisá los números importantes.
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Preguntas de ejemplo">
            {SUGGESTIONS.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => ask(suggestion)}
                  className="min-h-11 rounded-[14px] bg-brand-green-50 px-4 py-2 text-left text-sm font-semibold text-brand-green-700 hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ol role="log" aria-live="polite" aria-label="Conversación" className="space-y-4">
          {messages.map((message, index) => (
            <li key={message.id} className={message.role === "user" ? "flex justify-end" : undefined}>
              {message.role === "user" ? (
                <p className="max-w-[85%] rounded-3xl bg-action-primary px-4 py-3 text-base whitespace-pre-wrap text-on-action-primary">
                  {messageText(message)}
                </p>
              ) : (
                <Answer view={toAnswerView(message)} finished={!(busy && index === messages.length - 1)} />
              )}
            </li>
          ))}
          {waiting && (
            <li role="status" className="text-sm text-fg-muted">
              Pensando…
            </li>
          )}
        </ol>
      )}

      <FormBanner message={errorText} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <TextField
            label="Tu pregunta"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={CHAT_DATOS_MAX_QUESTION_CHARS}
            autoComplete="off"
            placeholder="Escribí tu pregunta"
          />
        </div>
        <PrimaryButton type="submit" disabled={busy || input.trim() === ""} className="sm:w-auto sm:px-8">
          {busy ? "Respondiendo…" : "Preguntar"}
        </PrimaryButton>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-[14px] px-5 py-2 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:text-fg-disabled"
          >
            Nueva conversación
          </button>
        )}
      </form>
      <div ref={endRef} />
    </section>
  );
}
