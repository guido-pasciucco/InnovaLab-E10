import { createUIMessageStreamResponse, type LanguageModel } from "ai";
import { NextResponse } from "next/server";

import { streamChatDatosAnswer, type ChatDatosLogEntry } from "@/lib/chat-datos/agent";
import type { ChatDatosConfig } from "@/lib/chat-datos/config";
import { buildSystemPrompt } from "@/lib/chat-datos/prompt";
import { chatRequestSchema } from "@/lib/chat-datos/request";
import type { ChatDatosToolDeps } from "@/lib/chat-datos/tools";
import { AppError } from "@/lib/errors/app-error";
import { fail, handleRouteErrors } from "@/lib/errors/handle-route-errors";
import type { SessionUser, VerifiedUserId } from "@/lib/services/auth";

// Everything the door needs from outside, so a test can run it with a scripted
// model and no AWS, database or session. route.ts wires the real ones.
export type ChatDatosHandlerDeps = {
  readConfig: () => ChatDatosConfig;
  getUser: () => Promise<SessionUser | null>;
  createModel: (modelId: string) => LanguageModel;
  // Tool data sources tied to this user. The id comes from the session only.
  createToolDeps: (userId: VerifiedUserId) => ChatDatosToolDeps;
  loadSchema: () => Promise<string>;
  today: () => string;
  log?: (entry: ChatDatosLogEntry) => void;
};

// POST /api/chat-datos: the only Route Handler of the app (see ADR 04). The
// answer streams, which a Server Action cannot do.
export function createChatDatosHandler(deps: ChatDatosHandlerDeps) {
  return handleRouteErrors(
    async (request: Request) => {
      const config = deps.readConfig();
      // Off means it does not exist: no session check, no body read.
      if (!config.enabled) return fail("CHAT_DATOS_DISABLED");

      const user = await deps.getUser();
      if (!user) return fail("UNAUTHORIZED");

      // Only `question` and `history` are read. The user is the session's.
      const { question, history } = chatRequestSchema.parse(await readBody(request));

      const model = deps.createModel(config.modelId);
      const instructions = buildSystemPrompt({ schema: await deps.loadSchema(), today: deps.today() });

      const stream = streamChatDatosAnswer({
        model,
        instructions,
        question,
        history,
        deps: deps.createToolDeps(user.id),
        showSql: config.showSql,
        abortSignal: request.signal,
        log: deps.log,
      });

      const response = createUIMessageStreamResponse({ stream });
      return new NextResponse(response.body, { status: response.status, headers: response.headers });
    },
    // Anything unexpected before the stream starts reads as "not available now".
    "CHAT_DATOS_UNAVAILABLE",
  );
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION");
  }
}
