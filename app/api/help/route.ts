import { NextResponse } from "next/server";
import { createBedrockHelpModel } from "@/lib/help/bedrock";
import { readHelpConfig } from "@/lib/help/config";
import { readHelpCorpus } from "@/lib/help/corpus";
import { AppError } from "@/lib/errors/app-error";
import { handleRouteErrors } from "@/lib/errors/handle-route-errors";
import { streamHelpReply } from "@/lib/services/help";
import { getSessionUserService } from "@/lib/services/auth";
import { createRscSupabaseClient } from "@/lib/supabase/rsc";

export const POST = handleRouteErrors(async (request: Request) => {
  const config = readHelpConfig();
  if (!config) throw new AppError("HELP_DISABLED");

  await getSessionUserService(await createRscSupabaseClient());

  const stream = streamHelpReply(await request.json(), createBedrockHelpModel(config), readHelpCorpus());
  void stream.usage.then((usage) => {
    console.info("[help] tokens", usage);
  });

  const response = stream.toTextStreamResponse();
  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
});
