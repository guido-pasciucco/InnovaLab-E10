import { describe, expect, it } from "vitest";
import { buildConfirmation } from "./build-confirmation";

describe("buildConfirmation", () => {
  it("construye la frase de confirmación exacta", () => {
    const result = buildConfirmation({
      name: "alfajores",
      unit: "caja de 6",
      volume: 6,
    });

    expect(result).toBe(
      "Vamos a calcular el costo de alfajores en caja de 6, con un volumen de 6 por mes.",
    );
  });
});
