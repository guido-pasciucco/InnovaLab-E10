import { z } from "zod";

// Field rules for the help chat. The panel and the server share this
// contract. There is no table: the thread lives in the browser.

export const helpRoleField = z.enum(["user", "assistant"], {
  error: "El mensaje tiene que ser de la persona o del asistente.",
});

export const helpContentField = z
  .string()
  .trim()
  .min(1, { error: "Escribí una pregunta." })
  .max(2_000, { error: "La pregunta es demasiado larga." });

export const helpMessageField = z.object({
  role: helpRoleField,
  content: helpContentField,
});
