import "server-only";

// Settings of the "Chateá con tus datos" agent (#279). Everything here is read
// on the server; the screen only learns whether the feature is on.

// The model id can be a bare id, a regional inference profile ("us.anthropic...")
// or an ARN. Bedrock decides which one the IAM user may invoke, so the value
// is not restricted here: change CHAT_DATOS_MODEL, not the code.
export const CHAT_DATOS_DEFAULT_MODEL = "anthropic.claude-haiku-4-5-20251001-v1:0";

// Model calls per question: search, SQL, a retry after a rejected query, and
// the final answer. Past this the agent stops, so a loop cannot run up cost.
export const CHAT_DATOS_MAX_STEPS = 6;

// Tokens the model may write in each call. An answer is a few paragraphs, a
// table and a chart specification.
export const CHAT_DATOS_MAX_OUTPUT_TOKENS = 1_500;

export type ChatDatosConfig = {
  enabled: boolean;
  // Sends the SQL to the screen. Off in production: the SQL stays in the log.
  showSql: boolean;
  modelId: string;
};

type ChatDatosEnv = Record<string, string | undefined>;

export function readChatDatosConfig(env: ChatDatosEnv = process.env): ChatDatosConfig {
  return {
    enabled: env.CHAT_DATOS_ENABLED === "true",
    showSql: env.CHAT_DATOS_SHOW_SQL === "true",
    modelId: env.CHAT_DATOS_MODEL?.trim() || CHAT_DATOS_DEFAULT_MODEL,
  };
}

export function isChatDatosEnabled(env: ChatDatosEnv = process.env): boolean {
  return readChatDatosConfig(env).enabled;
}
