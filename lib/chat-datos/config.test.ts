import { describe, expect, it } from "vitest";

import {
  CHAT_DATOS_DEFAULT_MODEL,
  isChatDatosEnabled,
  readChatDatosConfig,
} from "./config";

describe("readChatDatosConfig", () => {
  it("is off by default", () => {
    expect(readChatDatosConfig({})).toEqual({
      enabled: false,
      showSql: false,
      modelId: CHAT_DATOS_DEFAULT_MODEL,
    });
  });

  it("turns on only with the exact value true", () => {
    expect(isChatDatosEnabled({ CHAT_DATOS_ENABLED: "true" })).toBe(true);
    for (const value of ["false", "1", "TRUE", "yes", ""]) {
      expect(isChatDatosEnabled({ CHAT_DATOS_ENABLED: value })).toBe(false);
    }
  });

  it("shows the SQL only with CHAT_DATOS_SHOW_SQL=true, apart from the enabled flag", () => {
    expect(readChatDatosConfig({ CHAT_DATOS_SHOW_SQL: "true" }).showSql).toBe(true);
    expect(readChatDatosConfig({ CHAT_DATOS_ENABLED: "true" }).showSql).toBe(false);
  });

  it("uses the configured model, and the default when it is empty", () => {
    expect(readChatDatosConfig({ CHAT_DATOS_MODEL: " us.anthropic.test-model " }).modelId).toBe(
      "us.anthropic.test-model",
    );
    expect(readChatDatosConfig({ CHAT_DATOS_MODEL: "  " }).modelId).toBe(CHAT_DATOS_DEFAULT_MODEL);
  });
});
