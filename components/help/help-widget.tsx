
"use client";

import Image from "next/image";
import { ArrowUp, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import type { HelpMessage } from "@/lib/schemas/help/help";
import {
  createHelpRequestGuard,
  readHelpThread,
  writeHelpThread,
} from "@/lib/help/client-session";
import {
  appendAssistantTurn,
  appendUserMessage,
  toModelContext,
  withAssistantSnapshot,
} from "@/lib/help/thread";
import { HelpMarkdown } from "./help-markdown";

type HelpWidgetProps = {
  enabled: boolean;
  userId: string | null;
};

export const SUGGESTED_QUESTIONS = [
  "¿Qué es el margen?",
  "¿Cómo calculo mis costos?",
  "¿Qué es el punto de equilibrio?",
] as const;

export function HelpWidget({ enabled, userId }: HelpWidgetProps) {
  if (!enabled) return null;

  return (
    <HelpWidgetSession
      key={userId ?? "signed-out"}
      userId={userId}
    />
  );
}

// Mensajes del usuario en texto plano.
// Respuestas de Mora renderizadas como Markdown seguro.
export function HelpMessageItem({
  message,
  streaming,
}: {
  message: HelpMessage;
  streaming: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-[18px] bg-action-primary px-3 py-2 text-sm leading-6 text-on-action-primary">
          {message.content}
        </p>
      </div>
    );
  }

  // No mostrar burbujas vacías al finalizar una respuesta.
  if (!message.content && !streaming) {
    return null;
  }

  return (
    <div className="flex justify-start">
      <div className="min-w-0 max-w-[88%] break-words rounded-[18px] bg-surface-tint px-3 py-2 text-sm leading-6 text-fg">
        {message.content ? (
          <HelpMarkdown content={message.content} />
        ) : (
          <span
            role="status"
            aria-label="Mora está escribiendo"
            className="text-fg-muted"
          >
            ...
          </span>
        )}
      </div>
    </div>
  );
}

export function MoraWelcome({
  onSelect,
  disabled = false,
}: {
  onSelect: (question: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 py-3">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-fg">
          ¡Hola! Soy Mora.
        </h3>

        <p className="text-sm leading-6 text-fg-muted">
          Te ayudo a entender tus costos, precios y las
          herramientas de Numora.
        </p>

        <p className="text-sm font-medium text-fg">
          ¿Por dónde empezamos?
        </p>
      </div>

      <div
        className="flex flex-wrap gap-2"
        aria-label="Preguntas sugeridas"
      >
        {SUGGESTED_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(question)}
            className="min-h-11 rounded-full border border-border-default bg-surface-tint px-3 py-2 text-left text-xs font-medium text-fg transition-colors hover:border-action-primary hover:bg-action-tonal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}

function HelpWidgetSession({
  userId,
}: Pick<HelpWidgetProps, "userId">) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const loadedRef = useRef(false);
  const requestGuardRef = useRef(createHelpRequestGuard());

  // Cancelar solicitudes al desmontar el componente.
  useEffect(() => {
    const guard = requestGuardRef.current;

    return () => {
      guard.invalidate();
    };
  }, []);

  // Persistir la conversación por usuario.
  useEffect(() => {
    if (!userId || !loadedRef.current) return;

    writeHelpThread(sessionStorage, userId, messages);
  }, [messages, userId]);

  // Mantener visibles los mensajes recientes.
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
    });
  }, [messages, open]);

  // Foco inicial y cierre con Escape.
  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);

        requestAnimationFrame(() => {
          launcherRef.current?.focus();
        });
      }
    }

    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  async function send(suggestedQuestion?: string) {
    const content = (suggestedQuestion ?? draft).trim();

    if (!content || pending) return;

    // El historial visible se conserva.
    // Solo el contexto limitado viaja a la API.
    const next = appendUserMessage(messages, content);

    setMessages(next);
    setDraft("");
    setError(null);
    setPending(true);

    const request = requestGuardRef.current.start();
    const { controller, isCurrent } = request;

    try {
      const response = await fetch("/api/help", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messages: toModelContext(next),
        }),
        signal: controller.signal,
      });

      if (!isCurrent()) return;

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

      setMessages((current) => appendAssistantTurn(current));

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (!isCurrent()) {
          await reader.cancel();
          return;
        }

        answer += decoder.decode(value, {
          stream: true,
        });

        const snapshot = answer;

        setMessages((current) =>
          withAssistantSnapshot(current, snapshot),
        );
      }
    } catch (caught) {
      if (
        isCurrent() &&
        !(
          caught instanceof DOMException &&
          caught.name === "AbortError"
        )
      ) {
        setError(
          "No pude obtener una respuesta. Probá de nuevo.",
        );
      }
    } finally {
      if (isCurrent()) {
        request.finish();
        setPending(false);
      }
    }
  }

  function openAssistant() {
    loadedRef.current = true;

    if (userId) {
      setMessages(readHelpThread(sessionStorage, userId));
    }

    setOpen(true);
  }

  function closeAssistant() {
    setOpen(false);

    requestAnimationFrame(() => {
      launcherRef.current?.focus();
    });
  }

  function handleLauncherClick() {
    if (open) {
      closeAssistant();
    } else {
      openAssistant();
    }
  }

  function handlePanelKeyDown(
    event: ReactKeyboardEvent<HTMLElement>,
  ) {
    if (event.key !== "Escape") return;

    event.preventDefault();
    closeAssistant();
  }

  return (
    <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-50 flex flex-col items-end gap-2">
      {open && (
        <section
          id="mora-chat"
          aria-label="Mora, asistente de Numora"
          onKeyDown={handlePanelKeyDown}
          className="
            pointer-events-auto
            flex min-h-0 flex-col overflow-hidden
            rounded-[20px]
            border border-border-default
            bg-surface
            shadow-[0_16px_40px_rgba(25,65,38,0.16)]
            w-[min(24rem,calc(100vw-2rem))]
            h-[min(29rem,calc(100dvh-6rem))]
            max-h-[70dvh]
            max-sm:w-[calc(100vw-2rem)]
          "
        >
          {/* Encabezado */}
          <header className="flex shrink-0 items-center gap-3 border-b border-border-default bg-[linear-gradient(110deg,#C4EAD2_0%,#D8E4D8_37%,#DCD0EB_68%,#D6B7EB_100%)] px-3 py-2.5">
            <Image
              src="/help/mora-avatar.png"
              alt=""
              width={46}
              height={46}
              className="h-11 w-11 shrink-0 object-contain"
            />

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold leading-5 text-fg">
                Mora
              </h2>

              <p className="text-xs text-fg-muted">
                Tu asistente de Numora
              </p>
            </div>

            <button
              type="button"
              onClick={closeAssistant}
              aria-label="Cerrar Mora"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-action-tonal hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </header>

          {/* Conversación */}
          <div
            ref={listRef}
            role="log"
            aria-label="Mensajes de Mora"
            aria-live="polite"
            aria-relevant="additions text"
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-surface px-3 py-3"
          >
            {messages.length === 0 && (
              <MoraWelcome
                disabled={pending}
                onSelect={(question) => {
                  void send(question);
                }}
              />
            )}

            {messages.map((message, index) => (
              <HelpMessageItem
                key={`${message.role}-${index}`}
                message={message}
                streaming={pending}
              />
            ))}

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>

          {/* Campo de escritura */}
          <form
            className="flex shrink-0 items-center gap-2 border-t border-border-default bg-surface px-3 py-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <label
              className="sr-only"
              htmlFor="help-question"
            >
              Pregunta para Mora
            </label>

            <input
              ref={inputRef}
              id="help-question"
              value={draft}
              onChange={(event) =>
                setDraft(event.target.value)
              }
              disabled={pending}
              placeholder="Escribí tu pregunta"
              className="
                min-h-11 min-w-0 flex-1
                rounded-[14px]
                border border-border-control
                bg-surface
                px-3
                text-base text-fg
                placeholder:text-fg-muted
                focus-visible:outline-2
                focus-visible:outline-offset-2
                focus-visible:outline-focus
                disabled:opacity-60
                sm:text-sm
              "
            />

            <button
              type="submit"
              disabled={
                pending || draft.trim().length === 0
              }
              aria-label="Enviar pregunta"
              className="
                flex min-h-11 min-w-11
                items-center justify-center
                rounded-[14px]
                bg-action-primary
                text-on-action-primary
                transition-colors
                hover:bg-action-primary-hover
                focus-visible:outline-2
                focus-visible:outline-offset-2
                focus-visible:outline-focus
                disabled:cursor-not-allowed
                disabled:bg-action-disabled
                disabled:text-fg-disabled
              "
            >
              <ArrowUp aria-hidden="true" size={20} />
            </button>
          </form>
        </section>
      )}

      {/* Botón flotante: solo la mascota, sin recuadro */}
      <button
        ref={launcherRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? "mora-chat" : undefined}
        aria-label={
          open ? "Cerrar Mora" : "Abrir ayuda de Mora"
        }
        onClick={handleLauncherClick}
        className={`
          pointer-events-auto
          flex h-[68px] w-[68px]
          items-center justify-center
          rounded-full
          bg-transparent
          transition-transform
          hover:scale-105
          focus-visible:outline-2
          focus-visible:outline-offset-2
          focus-visible:outline-focus
          motion-reduce:transform-none
          ${open ? "hidden" : ""}
        `}
      >
        <Image
          src="/help/mora-avatar.png"
          alt=""
          width={68}
          height={68}
          priority
          className="h-[68px] w-[68px] object-contain drop-shadow-[0_8px_12px_rgba(76,37,98,0.22)]"
        />
      </button>
    </div>
  );
}
