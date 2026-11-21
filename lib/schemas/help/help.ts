import { z } from "zod";
import { helpMessageField } from "./fields";

export const HELP_THREAD_LIMIT = 6;
export const HELP_THREAD_CHARACTER_LIMIT = 6_000;

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
