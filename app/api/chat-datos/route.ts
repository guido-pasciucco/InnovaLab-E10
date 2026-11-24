import { getOptionalUser } from "@/lib/auth/optional-user";
import { readChatDatosConfig } from "@/lib/chat-datos/config";
import { createChatDatosModel } from "@/lib/chat-datos/model";
import { todayInBuenosAires } from "@/lib/chat-datos/prompt";
import { runAnalystQueryService } from "@/lib/services/analyst-query";
import { getAnalystSchemaDescriptionService } from "@/lib/services/analyst-schema";
import { createBedrockEmbedder } from "@/lib/services/knowledge-embeddings";
import { searchKnowledgeService } from "@/lib/services/knowledge-search";

import { createChatDatosHandler } from "./handler";

// A question can take a few model calls plus the queries.
export const maxDuration = 60;

export const POST = createChatDatosHandler({
  readConfig: () => readChatDatosConfig(),
  getUser: getOptionalUser,
  createModel: (modelId) => createChatDatosModel(modelId),
  createToolDeps: (userId) => {
    const embedTexts = createBedrockEmbedder();
    return {
      searchDocuments: (query) => searchKnowledgeService(query, embedTexts),
      runSql: (sql) => runAnalystQueryService(userId, sql),
    };
  },
  loadSchema: () => getAnalystSchemaDescriptionService(),
  today: () => todayInBuenosAires(),
});
