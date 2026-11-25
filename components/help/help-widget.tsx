"use client";

import { Button } from "@/components/ui/button";
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
  preview?: boolean;
  userId: string | null;
  chatDatosEnabled?: boolean;
};

export const SUGGESTED_QUESTIONS = [
  "¿Qué es el margen?",
  "¿Cómo calculo mis costos?",
  "¿Qué es el punto de equilibrio?",
] as const;

export function HelpWidget({ enabled, preview = false, userId, chatDatosEnabled = false }: HelpWidgetProps) {
  // Mora requires an authenticated user in every mode, including preview.
  if (!userId || (!enabled && !preview)) return null;

  return (
    <HelpWidgetSession
      key={userId ?? "signed-out"}
      preview={preview}
      userId={userId}
      chatDatosEnabled={chatDatosEnabled}
    />
  );
}

// Mensajes del usuario en texto plano.
// Respuestas de Mora renderizadas como Markdown seguro.
export function HelpMessageItem({
  message,
  streaming,
  chatDatosEnabled = false,
}: {
  message: HelpMessage;
  streaming: boolean;
  chatDatosEnabled?: boolean;
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
          <HelpMarkdown content={message.content} chatDatosEnabled={chatDatosEnabled} />
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
          <Button variant="ghost" size="md"
            key={question}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(question)}
            className="min-h-11! rounded-full! border! border-border-default! bg-surface-tint! px-3! py-2! text-left! text-xs! font-medium! text-fg! transition-colors! hover:border-action-primary! hover:bg-action-tonal! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! disabled:opacity-50!"
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
}

function HelpWidgetSession({
  preview = false,
  userId,
  chatDatosEnabled = false,
}: Pick<HelpWidgetProps, "preview" | "userId" | "chatDatosEnabled">) {
  const [open, setOpen] = useState(false);
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    if (open) {
      setGreetingVisible(false);
      setAvatarHovered(false);
    }
  }, [open]);

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

    if (preview) closeButtonRef.current?.focus();
    else inputRef.current?.focus();

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
  }, [open, preview]);

  async function send(suggestedQuestion?: string) {
    if (preview) return;

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

      if (!isCurrent()) return;

      if (!answer.trim()) {
        setError("No pude generar una respuesta. Probá de nuevo.");
        setMessages(next);
        return;
      }
    } catch (caught) {
      if (isCurrent()) {
        setError("No pude obtener una respuesta. Probá de nuevo.");
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
    <div className="pointer-events-none fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-[70] flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3 sm:bottom-[max(1rem,env(safe-area-inset-bottom))] sm:right-[max(1rem,env(safe-area-inset-right))] sm:max-w-[calc(100vw-2rem)]">
      {open && (
        <section
          id="mora-chat"
          aria-label={`Mora, asistente de Numora${preview ? " (vista previa)" : ""}`}
          onKeyDown={handlePanelKeyDown}
          className={`
            pointer-events-auto
            flex min-h-0 flex-col overflow-visible
            rounded-[30px]
            border-[1.5px] border-mora-border
            bg-surface
            shadow-[0_14px_38px_var(--mora-shadow)]
            relative after:content-[''] after:pointer-events-none after:absolute after:right-6 after:-bottom-3 after:h-3 after:w-5 after:bg-surface after:[clip-path:polygon(0_0,100%_0,100%_100%)]
            w-[min(24rem,calc(100vw-2rem))]
            h-[min(26rem,calc(100dvh-7rem))]
            max-h-[min(70dvh,38rem)]
            max-sm:w-[calc(100vw-2rem)]
          `}
        >
          {/* Encabezado */}
          <header className="flex shrink-0 items-center gap-3 rounded-t-[29px] border-b border-border-default bg-[linear-gradient(110deg,#C4EAD2_0%,#D8E4D8_37%,#DCD0EB_68%,#D6B7EB_100%)] px-3 py-2.5">
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
              {preview && (
                <span className="mt-1 inline-flex rounded-full bg-surface/80 px-2 py-0.5 text-[11px] font-semibold text-brand-green-700">
                  Vista previa
                </span>
              )}
            </div>

            <Button variant="ghost" size="md"
              ref={closeButtonRef}
              type="button"
              onClick={closeAssistant}
              aria-label="Cerrar Mora"
              className="flex! min-h-11! min-w-11! items-center! justify-center! rounded-xl! text-fg-muted! transition-colors! hover:bg-action-tonal! hover:text-fg! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus!"
            >
              <X aria-hidden="true" size={20} />
            </Button>
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
            {preview && (
              <p role="status" className="rounded-xl border border-border-default bg-surface-tint px-3 py-2 text-xs leading-5 text-fg-muted">
                Vista previa visual. Las consultas están deshabilitadas y no se enviarán datos a servicios externos.
              </p>
            )}
            {messages.length === 0 && (
              <MoraWelcome
                disabled={pending || preview}
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
                chatDatosEnabled={chatDatosEnabled}
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
            className="flex shrink-0 items-center gap-2 rounded-b-[29px] border-t border-border-default bg-surface px-3 py-2.5"
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
              disabled={pending || preview}
              placeholder={preview ? "Consultas deshabilitadas en vista previa" : "Escribí tu pregunta"}
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

            <Button variant="primary" size="md"
              type="submit"
              disabled={
                preview || pending || draft.trim().length === 0
              }
              aria-label="Enviar pregunta"
              className="
                flex! min-h-11 min-w-11
                items-center justify-center
                rounded-[14px]!
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
            </Button>
          </form>
        </section>
      )}

      {/* Botón flotante: solo la mascota, sin recuadro */}
      <Button variant="ghost" size="md"
        ref={launcherRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? "mora-chat" : undefined}
        aria-label={
          open ? "Cerrar Mora" : "Abrir ayuda de Mora"
        }
        onMouseEnter={() => {
          if (
            typeof window !== "undefined" &&
            window.matchMedia("(hover: hover)").matches &&
            !window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ) {
            setAvatarHovered(true);
            if (!open) setGreetingVisible(true);
          }
        }}
        onMouseLeave={() => {
          setAvatarHovered(false);
          setGreetingVisible(false);
        }}
        onFocus={() => {
          if (!open) setGreetingVisible(true);
        }}
        onBlur={() => setGreetingVisible(false)}
        onClick={() => {
          setGreetingVisible(false);
          handleLauncherClick();
        }}
        className={`
          pointer-events-auto
          relative
          flex h-[77px] w-[77px]
          items-center justify-center
          rounded-full!
          bg-transparent!
          p-0!
          transition-transform!
          hover:bg-transparent!
          hover:scale-105
          focus-visible:outline-2
          focus-visible:outline-offset-2
          focus-visible:outline-focus
          motion-reduce:transform-none
        `}
      >
        {!open && greetingVisible && (
          <span
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-xl border border-[#D6B7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#4C2562] shadow-[0_8px_20px_rgba(76,37,98,0.12)]"
          >
            ¡Hola! Soy Mora 👋
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-[9px] right-5"
              width="12"
              height="9"
              viewBox="0 0 12 9"
              fill="none"
            >
              <path
                d="M0 0 L6 9 L12 0"
                fill="white"
                stroke="#D6B7EB"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
        <span className="inline-block">
          <Image
            src={avatarHovered && !open ? "/help/mora-saludo-transparente.gif" : "/help/mora-quieta-transparente.png"}
            alt=""
            width={77}
            height={77}
            unoptimized={avatarHovered && !open}
            priority={!avatarHovered || open}
            className="h-[77px] w-[77px] object-contain drop-shadow-[0_10px_18px_rgba(76,37,98,0.22)]"
          />
        </span>
      </Button>
    </div>
  );
}
