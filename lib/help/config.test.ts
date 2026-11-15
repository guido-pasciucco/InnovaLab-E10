import { describe, expect, it } from "vitest";
import { isHelpEnabled, readHelpConfig } from "./config";

const enabled = {
  HELP_ENABLED: "true",
  HELP_PROVIDER: "bedrock",
  HELP_MODEL: "arn:aws:bedrock:us-east-1:123456789012:application-inference-profile/abc123",
  AWS_REGION: "us-east-1",
  AWS_ACCESS_KEY_ID: "AKIAEXAMPLE",
  AWS_SECRET_ACCESS_KEY: "secret",
};

describe("readHelpConfig", () => {
  it("reads a complete Bedrock profile", () => {
    expect(readHelpConfig(enabled)?.modelId).toContain("application-inference-profile");
  });

  it("stays off when the flag is missing", () => {
    expect(isHelpEnabled({ ...enabled, HELP_ENABLED: "false" })).toBe(false);
  });

  it("stays off when a credential is missing", () => {
    expect(readHelpConfig({ ...enabled, AWS_SECRET_ACCESS_KEY: "" })).toBeNull();
  });

  it("stays off when the model is not an inference profile", () => {
    expect(
      readHelpConfig({ ...enabled, HELP_MODEL: "anthropic.claude-haiku-4-5-20251001-v1:0" }),
    ).toBeNull();
  });
});
