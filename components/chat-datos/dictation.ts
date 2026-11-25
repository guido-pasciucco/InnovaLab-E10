// The browser turns speech into text. This page only receives that text.

export type DictationResult = { 0?: { transcript?: string } };

export type DictationResultEvent = {
  results: ArrayLike<DictationResult>;
};

export type DictationEngine = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: DictationResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type DictationCtor = new () => DictationEngine;

type DictationHost = {
  SpeechRecognition?: DictationCtor;
  webkitSpeechRecognition?: DictationCtor;
};

export type DictationHandlers = {
  onTranscript: (spoken: string) => void;
  onEnd: () => void;
  onError: (message: string | null) => void;
};

export function speechRecognitionCtor(host: DictationHost | null = browserHost()): DictationCtor | null {
  if (!host) return null;
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

export function spokenText(results: ArrayLike<DictationResult>): string {
  return Array.from(results, (result) => result[0]?.transcript ?? "").join("");
}

// `existing` is what was already in the box before this listening session.
// `spoken` is the whole phrase heard so far, so later updates replace it.
export function joinDictation(existing: string, spoken: string, maxChars: number): string {
  const base = existing.trim();
  const heard = spoken.replace(/\s+/g, " ").trim();
  const combined = [base, heard].filter((part) => part !== "").join(" ");
  return combined.slice(0, maxChars);
}

export function dictationErrorMessage(code: string): string | null {
  if (code === "aborted") return null;
  if (code === "not-allowed" || code === "service-not-allowed") {
    return "El navegador bloqueó el micrófono. Habilitalo en el candado de la barra de direcciones.";
  }
  if (code === "audio-capture") return "No se encontró un micrófono.";
  if (code === "no-speech") return "No se escuchó nada. Intentá de nuevo.";
  if (code === "network") return "No se pudo oír. Revisá la conexión e intentá de nuevo.";
  return "No se pudo usar el micrófono.";
}

export function bindDictation(engine: DictationEngine, handlers: DictationHandlers): void {
  engine.lang = "es-AR";
  engine.continuous = false;
  engine.interimResults = true;
  engine.onresult = (event) => {
    handlers.onTranscript(spokenText(event.results));
  };
  engine.onerror = (event) => {
    handlers.onError(dictationErrorMessage(event.error));
  };
  engine.onend = () => {
    handlers.onEnd();
  };
}

function browserHost(): DictationHost | null {
  if (typeof window === "undefined") return null;
  return window as unknown as DictationHost;
}
