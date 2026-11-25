import { z } from "zod";

// Body of POST /api/chat-datos. Limits keep one request from sending an
// oversized prompt to the model.
export const CHAT_DATOS_MAX_QUESTION_CHARS = 2_000;
export const CHAT_DATOS_MAX_HISTORY_MESSAGES = 10;
export const CHAT_DATOS_MAX_HISTORY_MESSAGE_CHARS = 4_000;

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  // Only the text of each turn travels back. Tool results and SQL stay on the
  // server, so the browser cannot pass the model data it did not get from us.
  content: z
    .string()
    .trim()
    .min(1, "El mensaje del historial está vacío.")
    .max(CHAT_DATOS_MAX_HISTORY_MESSAGE_CHARS, "Un mensaje del historial es demasiado largo."),
});

export type ChatHistoryMessage = z.infer<typeof historyMessageSchema>;

// The history is whole question and answer pairs: it starts with the user and
// ends with the assistant, so the new question keeps the turns alternating.
const historySchema = z
  .array(historyMessageSchema)
  .max(CHAT_DATOS_MAX_HISTORY_MESSAGES, "El historial es demasiado largo.")
  .refine(
    (messages) => messages.every((message, index) => message.role === (index % 2 === 0 ? "user" : "assistant")),
    "El historial tiene que alternar pregunta y respuesta, empezando por la pregunta.",
  )
  .refine(
    (messages) => messages.length % 2 === 0,
    "El historial tiene que terminar con una respuesta.",
  );

export const chatRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Escribí una pregunta.")
    .max(CHAT_DATOS_MAX_QUESTION_CHARS, "La pregunta es demasiado larga."),
  history: historySchema.default([]),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
