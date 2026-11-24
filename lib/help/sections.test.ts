import { describe, expect, it } from "vitest";
import {
  HELP_CONTEXT_MAX_CHARS,
  buildHelpContext,
  lastUserQuestion,
  matchHelpTopics,
  normalizeHelpText,
  splitHelpSections,
} from "./sections";

const glosario = `# Glosario
> Nota editorial del editor: no publicar.

## Margen sobre el precio
Definición de margen sobre el precio.

## Punto de equilibrio
Definición de punto de equilibrio.
`;

const navegacion = `# Navegación
> Nota editorial del editor: no publicar.

## Insumos y packaging (P08–P09)
Dónde se cargan los insumos.

### Qué datos se registran
Subsección que debe quedarse dentro de Insumos y packaging.

## Reglas para responder preguntas de navegación
Preguntas frecuentes de ubicación.
`;

const base = "# Ayuda de Numora\n\nMargen: parte del precio de venta.";

describe("normalizeHelpText", () => {
  it("lowercases the text and removes the accents", () => {
    expect(normalizeHelpText("Contribución y Contribución")).toBe("contribucion y contribucion");
    expect(normalizeHelpText("¿Dónde cargo la contraseña?")).toBe(
      "¿donde cargo la contrasena?",
    );
  });
});

describe("splitHelpSections", () => {
  it("drops the text before the first heading", () => {
    const sections = splitHelpSections(glosario);

    expect(sections).toHaveLength(2);
    expect(sections[0]?.heading).toBe("Margen sobre el precio");
    expect(sections.every((section) => section.heading !== "")).toBe(true);
  });

  it("keeps the h3 headings inside their h2 section", () => {
    const sections = splitHelpSections(navegacion);
    const insumos = sections.find((section) => section.heading === "Insumos y packaging (P08–P09)");

    expect(insumos?.body).toContain("### Qué datos se registran");
    expect(sections.map((section) => section.heading)).toEqual([
      "Insumos y packaging (P08–P09)",
      "Reglas para responder preguntas de navegación",
    ]);
  });
});

describe("matchHelpTopics", () => {
  it("returns the financial rules when the question asks about a definition", () => {
    expect(matchHelpTopics("¿Qué es el margen?").map((rule) => rule.id)).toContain("margen");
    expect(matchHelpTopics("¿Cómo se calcula el punto de equilibrio?").map((rule) => rule.id)).toContain(
      "punto-de-equilibrio",
    );
  });

  it("returns the rule when the question uses a synonym", () => {
    expect(matchHelpTopics("¿cuánto gano por venta?").map((rule) => rule.id)).toContain("margen");
    expect(matchHelpTopics("¿qué significa el markup?").map((rule) => rule.id)).toContain("recargo");
    expect(matchHelpTopics("¿cuánto vender para no perder plata?").map((rule) => rule.id)).toContain(
      "punto-de-equilibrio",
    );
  });

  it("returns the rule when the question is written with accents", () => {
    expect(matchHelpTopics("¿Qué es la contribución?").map((rule) => rule.id)).toContain(
      "contribucion",
    );
  });

  it("returns the navigation rules for a location question", () => {
    const ids = matchHelpTopics("¿dónde cargo la harina?").map((rule) => rule.id);

    expect(ids).toContain("faq-navegacion");
    expect(ids).toContain("insumos");
  });

  it("returns no rule when the question is out of the help scope", () => {
    expect(matchHelpTopics("¿Cuál es la capital de Francia?")).toEqual([]);
  });

  it("returns no rule for an empty question", () => {
    expect(matchHelpTopics("   ")).toEqual([]);
  });
});

describe("buildHelpContext", () => {
  it("returns the base alone when no rule matches", () => {
    const context = buildHelpContext(base, "¿Cuál es la capital de Francia?", {
      glosario,
      navegacion,
    });

    expect(context).toBe(base);
  });

  it("returns the base alone when the question is empty", () => {
    expect(buildHelpContext(base, "   ", { glosario, navegacion })).toBe(base);
  });

  it("returns the base alone when the curated documents are missing", () => {
    expect(buildHelpContext(base, "¿qué es el margen?", { glosario: "", navegacion: "" })).toBe(
      base,
    );
  });

  it("keeps the base document as the first block of the context", () => {
    const context = buildHelpContext(base, "¿qué es el margen?", { glosario, navegacion });

    expect(context.startsWith(base)).toBe(true);
    expect(context).toContain("## Margen sobre el precio");
  });

  it("adds the navigation section for a location question", () => {
    const context = buildHelpContext(base, "¿dónde cargo la harina?", { glosario, navegacion });

    expect(context).toContain("## Insumos y packaging (P08–P09)");
    expect(context).toContain("## Reglas para responder preguntas de navegación");
  });

  it("never sends the editorial preamble of the documents", () => {
    const context = buildHelpContext(base, "¿dónde cargo la harina?", { glosario, navegacion });

    expect(context).not.toContain("Nota editorial");
  });

  it("stays within the context budget when every rule matches", () => {
    const question = [
      "margen",
      "recargo",
      "contribución",
      "punto de equilibrio",
      "equilibrio en pesos",
      "costos",
      "gastos fijos",
      "capacidad",
      "insumos",
      "recetas",
      "presentaciones",
      "crear cuenta",
      "menú",
      "dónde cargo",
      "tablero",
      "impuestos",
    ].join(" ");

    const context = buildHelpContext(base, question, { glosario, navegacion });

    expect(context.length).toBeLessThanOrEqual(HELP_CONTEXT_MAX_CHARS);
    expect(context.startsWith(base)).toBe(true);
  });
});

describe("lastUserQuestion", () => {
  it("returns the last user message of the thread", () => {
    const raw = {
      messages: [
        { role: "user", content: "Primera" },
        { role: "assistant", content: "Respuesta" },
        { role: "user", content: "Segunda" },
      ],
    };

    expect(lastUserQuestion(raw)).toBe("Segunda");
  });

  it("returns an empty string when the body is not a thread", () => {
    expect(lastUserQuestion(undefined)).toBe("");
    expect(lastUserQuestion(null)).toBe("");
    expect(lastUserQuestion("margen")).toBe("");
    expect(lastUserQuestion({ messages: "margen" })).toBe("");
    expect(lastUserQuestion({ messages: [{ role: "assistant", content: "sola" }] })).toBe("");
    expect(lastUserQuestion({ messages: [{ role: "user", content: 42 }] })).toBe("");
  });
});
