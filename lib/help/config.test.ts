import { describe, expect, it } from "vitest";
import { isHelpEnabled, isHelpPreviewEnabled, readHelpConfig } from "./config";

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

describe("isHelpPreviewEnabled", () => {
  const localPreview = {
    NODE_ENV: "development",
    HELP_PREVIEW: "true",
    SITE_URL: "http://localhost:3000",
  };

  it("turns on for an explicit local development origin", () => {
    expect(isHelpPreviewEnabled(localPreview)).toBe(true);
    expect(isHelpPreviewEnabled({ ...localPreview, SITE_URL: "http://127.0.0.1:3000" })).toBe(true);
    expect(isHelpPreviewEnabled({ ...localPreview, SITE_URL: "http://[::1]:3000" })).toBe(true);
  });

  it("stays off outside development", () => {
    expect(isHelpPreviewEnabled({ ...localPreview, NODE_ENV: "production" })).toBe(false);
    expect(isHelpPreviewEnabled({ ...localPreview, NODE_ENV: "test" })).toBe(false);
  });

  it("stays off for remote or non-http origins", () => {
    expect(isHelpPreviewEnabled({ ...localPreview, SITE_URL: "https://numora.example" })).toBe(false);
    expect(isHelpPreviewEnabled({ ...localPreview, SITE_URL: "https://localhost:3000" })).toBe(false);
  });

  it("stays off when the local configuration is incomplete or malformed", () => {
    expect(isHelpPreviewEnabled({ ...localPreview, HELP_PREVIEW: "1" })).toBe(false);
    expect(isHelpPreviewEnabled({ ...localPreview, SITE_URL: "" })).toBe(false);
    expect(isHelpPreviewEnabled({ ...localPreview, SITE_URL: "not-a-url" })).toBe(false);
  });
});
