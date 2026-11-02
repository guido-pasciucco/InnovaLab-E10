import { describe, expect, it } from "vitest";

import {
  GENERIC_SUBMIT_ERROR_MESSAGE,
  TRANSPORT_ERROR_MESSAGE,
  toSubmitErrorMessage,
} from "./use-transport-aware-action";

describe("toSubmitErrorMessage", () => {
  it("maps fetch/network failures (TypeError) to the connection message", () => {
    expect(toSubmitErrorMessage(new TypeError("Failed to fetch"))).toBe(TRANSPORT_ERROR_MESSAGE);
    expect(toSubmitErrorMessage(new TypeError("fetch failed"))).toBe(TRANSPORT_ERROR_MESSAGE);
  });

  it("keeps a generic message for any other error", () => {
    expect(toSubmitErrorMessage(new Error("boom"))).toBe(GENERIC_SUBMIT_ERROR_MESSAGE);
    expect(toSubmitErrorMessage("boom")).toBe(GENERIC_SUBMIT_ERROR_MESSAGE);
  });
});
