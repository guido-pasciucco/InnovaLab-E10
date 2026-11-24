import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  MARKUP_PERCENT_INVALID_MESSAGE,
  MARKUP_PERCENT_MAX_MESSAGE,
  MARKUP_PERCENT_NON_POSITIVE_MESSAGE,
  MARKUP_PERCENT_REQUIRED_MESSAGE,
} from "./fields";
import { markupFormSchema } from "./pricing";

function fieldErrors(input: unknown) {
  const result = markupFormSchema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("markupFormSchema", () => {
  it("accepts a markup with a decimal comma and normalizes it", () => {
    expect(markupFormSchema.parse({ markupPercent: "30,5" })).toEqual({
      markupPercent: "30.5",
    });
  });

  it.each([
    ["0", MARKUP_PERCENT_NON_POSITIVE_MESSAGE],
    ["-5", MARKUP_PERCENT_NON_POSITIVE_MESSAGE],
    ["-0,01", MARKUP_PERCENT_NON_POSITIVE_MESSAGE],
  ])("rejects a non-positive markup %j", (markupPercent, message) => {
    expect(fieldErrors({ markupPercent })).toEqual({ markupPercent: [message] });
  });

  it.each(["abc", "1e3", "1.000,50", "30,123"])(
    "rejects a malformed markup %j",
    (markupPercent) => {
      expect(fieldErrors({ markupPercent })).toEqual({
        markupPercent: [MARKUP_PERCENT_INVALID_MESSAGE],
      });
    },
  );

  it("rejects an empty markup", () => {
    expect(fieldErrors({ markupPercent: "   " })).toEqual({
      markupPercent: [MARKUP_PERCENT_REQUIRED_MESSAGE],
    });
  });

  it("rejects a markup above 1000 % with the shared message", () => {
    expect(fieldErrors({ markupPercent: "1000,01" })).toEqual({
      markupPercent: [MARKUP_PERCENT_MAX_MESSAGE],
    });
  });

  it("accepts the boundaries of the rule", () => {
    for (const markupPercent of ["0,01", "30.00", "999,99", "1000"]) {
      expect(markupFormSchema.safeParse({ markupPercent }).success).toBe(true);
    }
  });
});
