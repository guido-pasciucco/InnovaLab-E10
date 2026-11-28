import { NextResponse } from "next/server";
import { isChatDatosEnabled } from "@/lib/chat-datos/config";
import { createBedrockHelpModel } from "@/lib/help/bedrock";
import { readHelpConfig } from "@/lib/help/config";
import { readHelpContext } from "@/lib/help/corpus";
import { AppError } from "@/lib/errors/app-error";
import { handleRouteErrors } from "@/lib/errors/handle-route-errors";
import { streamHelpReply } from "@/lib/services/help";
import {
  acquireHelpLeaseService,
  HELP_REQUEST_TIMEOUT_MS,
} from "@/lib/services/help-consumption";
import { getSessionUserService } from "@/lib/services/auth";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";
import { ZodError } from "zod";

export const POST = handleRouteErrors(async (request: Request) => {
  const config = readHelpConfig();
  if (!config) throw new AppError("HELP_DISABLED");

  const user = await getSessionUserService(await createRscSupabaseClient());
  const lease = await acquireHelpLeaseService(user.id);
  const requestController = new AbortController();
  const abortSignal = AbortSignal.any([
    request.signal,
    requestController.signal,
    AbortSignal.timeout(HELP_REQUEST_TIMEOUT_MS),
  ]);

  let stream: ReturnType<typeof streamHelpReply>;
  try {
    const raw = await request.json();
    stream = streamHelpReply(
      raw,
      createBedrockHelpModel(config),
      // The context depends on the question, so the body is read once here.
      readHelpContext(raw),
      abortSignal,
      { chatDatosEnabled: isChatDatosEnabled() },
    );
  } catch (error) {
  await lease.release();

  if (error instanceof AppError || error instanceof ZodError) {
    throw error;
  }

  throw new AppError("HELP_UNAVAILABLE");
}

  void stream.usage.then((usage) => {
    console.info("[help] tokens", usage);
  }).catch(() => {
    console.warn("[help] token usage unavailable");
  });

  const iterator = stream.textStream[Symbol.asyncIterator]();
  let first: IteratorResult<string>;
  try {
    first = await iterator.next();
  } catch {
  await lease.release();
  throw new AppError("HELP_UNAVAILABLE");
}

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done) controller.enqueue(encoder.encode(first.value));
        while (!abortSignal.aborted) {
          const chunk = await iterator.next();
          if (chunk.done) break;
          controller.enqueue(encoder.encode(chunk.value));
        }
        if (!abortSignal.aborted) controller.close();
        else controller.error(new Error("Help request aborted"));
      } catch {
        controller.error(new Error("Help stream unavailable"));
      } finally {
        await lease.release();
      }
    },
    async cancel() {
      requestController.abort();
      await iterator.return?.();
      await lease.release();
    },
  });

  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}, "HELP_UNAVAILABLE");
