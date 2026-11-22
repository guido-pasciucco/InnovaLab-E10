import { z } from "zod";
import { helpMessageField } from "./fields";

// The window of the thread sent to the model on each request. Older messages
// stay visible in the chat but are no longer part of the API context.
export const HELP_THREAD_LIMIT = 6;
export const HELP_THREAD_CHARACTER_LIMIT = 6_000;

// Visible history kept in the browser for the session. It is independent of
// HELP_THREAD_LIMIT: the person keeps reading the whole conversation while
// only the last turn window travels to the API. Documented roll-off: past
// this limit the oldest messages leave the visible history (they are never
// silently cut down to six). 100 messages of at most 2.000 characters fit
// comfortably in sessionStorage.
export const HELP_VISIBLE_THREAD_LIMIT = 100;

// The visit thread. The last turn is the new question.
export const helpRequestSchema = z
  .object({
    messages: z
      .array(helpMessageField)
      .min(1, { error: "Escribí una pregunta." })
      .max(HELP_THREAD_LIMIT, { error: "El hilo admite hasta seis mensajes." }),
  })
  .refine(
    (value) =>
      value.messages.reduce((total, message) => total + message.content.length, 0) <=
      HELP_THREAD_CHARACTER_LIMIT,
    {
      error: "La conversación es demasiado larga.",
      path: ["messages"],
    },
  )
  .refine((value) => value.messages.at(-1)?.role === "user", {
    error: "La última intervención tiene que ser una pregunta.",
    path: ["messages"],
  });

export type HelpRequest = z.infer<typeof helpRequestSchema>;
export type HelpMessage = HelpRequest["messages"][number];
