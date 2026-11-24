import "server-only";

// The assistant is on only with an application inference profile ARN.
// A bare model id would bill Bedrock without the project tag.
const INFERENCE_PROFILE_ARN =
  /^arn:aws:bedrock:[a-z0-9-]+:\d{12}:application-inference-profile\/[A-Za-z0-9]+$/;

export type HelpConfig = {
  provider: "bedrock";
  region: string;
  modelId: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type HelpEnv = Record<string, string | undefined>;

export function readHelpConfig(env: HelpEnv = process.env): HelpConfig | null {
  if (env.HELP_ENABLED !== "true") return null;
  if ((env.HELP_PROVIDER ?? "bedrock") !== "bedrock") return null;

  const region = env.AWS_REGION?.trim() ?? "";
  const modelId = env.HELP_MODEL?.trim() ?? "";
  const accessKeyId = env.AWS_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY?.trim() ?? "";

  if (!region || !accessKeyId || !secretAccessKey) return null;
  if (!INFERENCE_PROFILE_ARN.test(modelId)) return null;

  return {
    provider: "bedrock",
    region,
    modelId,
    accessKeyId,
    secretAccessKey,
  };
}

export function isHelpEnabled(env: HelpEnv = process.env): boolean {
  return readHelpConfig(env) !== null;
}
