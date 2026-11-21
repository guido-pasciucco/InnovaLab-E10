import { describe, expect, it } from "vitest";
import { buildHelpSystemPrompt } from "./prompt";

describe("buildHelpSystemPrompt", () => {
  it("includes the product text and the limit of the assistant", () => {
    const prompt = buildHelpSystemPrompt("Margen: parte del precio de venta.");
    expect(prompt).toContain("Margen: parte del precio de venta.");
    expect(prompt).toContain("No inventes un precio");
    expect(prompt).toContain("No pidas ni uses los números del cálculo");
    expect(prompt).toContain("gatito 🐱");
  });

it("uses a clear and professional tone", () => {
  const prompt = buildHelpSystemPrompt(
    "Margen: parte del precio de venta.",
  );

  expect(prompt).toContain("tono amable, profesional y accesible");
  expect(prompt).not.toContain("bizarro y algo grosero");
});

});
