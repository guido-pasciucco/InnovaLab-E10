import { describe, expect, it } from "vitest";
import { failureDetail } from "./failure-detail";

describe("failureDetail", () => {
  it("returns the error line when the CLI prints its banner first", () => {
    const output = "Vercel CLI 66.6.0\nRetrieving project…\nError: The specified token is not valid.";

    const detail = failureDetail(output, "secret-value");

    expect(detail).toBe("Error: The specified token is not valid.");
  });

  it("returns the last line when no line reports an error", () => {
    const output = "Resolving dependencies\nVercel CLI 66.6.0\n\nUnexpected response from the API\n";

    const detail = failureDetail(output, "secret-value");

    expect(detail).toBe("Unexpected response from the API");
  });

  it("returns undefined when the output is empty", () => {
    const output = "\n  \n";

    const detail = failureDetail(output, "secret-value");

    expect(detail).toBeUndefined();
  });

  it("hides the value when the output echoes it", () => {
    const output = "Vercel CLI 66.6.0\nError: Invalid value secret-value for DATABASE_URL";

    const detail = failureDetail(output, "secret-value");

    expect(detail).toBe("Error: Invalid value [valor oculto] for DATABASE_URL");
  });
});
