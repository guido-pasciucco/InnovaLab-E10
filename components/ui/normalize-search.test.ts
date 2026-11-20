import { describe, expect, it } from "vitest";

import { normalizeForSearch } from "./normalize-search";

describe("normalizeForSearch", () => {
  it("ignores case, accents and surrounding spaces", () => {
    expect(normalizeForSearch("  AzÚcar  ")).toBe("azucar");
    expect(normalizeForSearch("HARINA")).toBe("harina");
  });

  it("keeps digits and unit symbols", () => {
    expect(normalizeForSearch("Bolsa 1 kg")).toBe("bolsa 1 kg");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeForSearch("   ")).toBe("");
  });
});
