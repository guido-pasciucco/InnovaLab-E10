import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { readHelpCorpus, readHelpContext } from "./corpus";
import {
  HELP_CONTEXT_MAX_CHARS,
  HELP_TOPIC_RULES,
  normalizeHelpText,
  splitHelpSections,
} from "./sections";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    readFileSync: (path: string, ...args: unknown[]) => {
      if (
        process.env.TEST_MISSING_DOC === "1" &&
        String(path).endsWith("glosario-ayuda.md")
      ) {
        throw new Error("ENOENT: glosario-ayuda.md");
      }
      const fn = actual.readFileSync as (p: string, ...a: unknown[]) => string;
      return fn(path, ...args);
    },
  };
});

const CONTENT_PATH = join(process.cwd(), "content", "ayuda");

function readAyuda(file: string): string {
  return readFileSync(join(CONTENT_PATH, file), "utf8");
}

function ask(question: string): unknown {
  return { messages: [{ role: "user", content: question }] };
}

const everyKeyword = HELP_TOPIC_RULES.flatMap((rule) => rule.keywords).join(" ");

// Editorial and internal notes that belong to the documents and never to the
// prompt: the preambles carry them, and no rule points at the sections that
// repeat them.
const INTERNAL_NOTES = [
  "23/11/2026",
  "Regla para Mora",
  "revisión funcional pendiente",
  "READ-ONLY",
  "<!--",
  "Advertencias editoriales",
  "Validación pendiente",
  "Hugo",
  "Ariel",
  "Alejandro",
  "Malena",
];

describe("readHelpCorpus", () => {
  it("returns the base product document", () => {
    expect(readHelpCorpus()).toContain("# Ayuda de Numora");
  });
});

describe("readHelpContext", () => {
  it("keeps the three curated documents in the content folder", () => {
    expect(readAyuda("producto.md")).toContain("# Ayuda de Numora");
    expect(readAyuda("glosario-ayuda.md")).toContain("# Mora — Glosario");
    expect(readAyuda("navegacion-ayuda.md")).toContain("# Mora — Guía de navegación");
  });

  it("returns the base document when the question is out of the help scope", () => {
    expect(readHelpContext(ask("¿Cuál es la capital de Francia?"))).toBe(readHelpCorpus());
  });

  it("returns the base document when the body carries no question", () => {
    expect(readHelpContext({ messages: [] })).toBe(readHelpCorpus());
    expect(readHelpContext(undefined)).toBe(readHelpCorpus());
  });

  it("adds the glossary definition when the question asks for a financial concept", () => {
    const context = readHelpContext(ask("¿Qué es el margen?"));

    expect(context).toContain("## Margen sobre el precio");
    expect(context).toContain("## Margen en pesos");
  });

  it("adds the navigation section when the question asks where something is", () => {
    const context = readHelpContext(ask("¿Dónde cargo la harina?"));

    expect(context).toContain("## Insumos y packaging (P08–P09)");
    expect(context).toContain("## Reglas para responder preguntas de navegación");
  });

  it("adds the account section when the question uses a synonym of the access flow", () => {
    const context = readHelpContext(ask("Olvidé mi contraseña, ¿cómo la recupero?"));

    expect(context).toContain("## Acceso a Numora (P00–P06)");
  });

  it("keeps the context within the budget when every topic matches", () => {
    const context = readHelpContext(ask(everyKeyword));

    expect(context.length).toBeLessThanOrEqual(HELP_CONTEXT_MAX_CHARS);
    expect(context.startsWith(readHelpCorpus().trimEnd())).toBe(true);
    expect(context).toContain("## Precio sugerido");
  });

  it("keeps the editorial preamble and the internal notes out of the context", () => {
    const context = readHelpContext(ask(everyKeyword));

    for (const note of INTERNAL_NOTES) {
      expect(context, `el contexto no debe contener «${note}»`).not.toContain(note);
    }
  });

  it("describes the multiproduct tablero as a phase 2 feature", () => {
    const context = readHelpContext(
      ask("¿Cómo veo el tablero multiproducto de todo mi catálogo?"),
    );

    expect(context).toContain("## Tablero global de resultados");
    expect(context).toContain("fase 2");
  });

  it("distinguishes the current price convention from the phase 2 one", () => {
    const context = readHelpContext(ask("¿Cómo calcula Numora el precio sugerido?"));

    expect(context).toContain("## Precio sugerido");
    expect(context).toContain("Motor histórico verificado");
    expect(context).toContain("No presentar el recargo como la fórmula vigente");
  });

  it("selects the period-costs section for a business-costs question", () => {
    const context = readHelpContext(ask("¿Dónde cargo los costos de mi negocio?"));

    expect(context).toContain("## Gastos generales y distribución (P14–P15)");
    expect(context).toContain("## Gastos fijos, indirectos y de estructura");
    expect(context).not.toContain("## Costo variable");
    expect(context).not.toContain("## Costo total unitario");
  });

  it("selects the total-cost definition for a per-unit cost question", () => {
    const context = readHelpContext(ask("¿Cuánto me cuesta producir un alfajor?"));

    expect(context).toContain("## Costo total unitario");
    expect(context).not.toContain("## Gastos generales y distribución (P14–P15)");
    expect(context).not.toContain("## Costo variable");
  });

  it("selects the results tablero for a results question", () => {
    const context = readHelpContext(ask("¿Dónde veo mis resultados?"));

    expect(context).toContain("## Tablero global de resultados");
    expect(context).not.toContain("## Costo variable");
    expect(context).not.toContain("## Costo total unitario");
  });

  it("selects both margin definitions for a margin question", () => {
    const context = readHelpContext(ask("¿Qué es el margen?"));

    expect(context).toContain("## Margen sobre el precio");
    expect(context).toContain("## Margen en pesos");
    expect(context).not.toContain("## Equilibrio en pesos");
    expect(context).not.toContain("## Tablero global de resultados");
    expect(context).not.toContain("## Mezcla de productos");
  });

  it("selects margin and markup definitions without mixing them", () => {
    const context = readHelpContext(ask("¿Qué diferencia hay entre margen y recargo?"));

    expect(context).toContain("## Margen sobre el precio");
    expect(context).toContain("## Recargo sobre el costo (markup)");
    expect(context).toContain("## Precio sugerido");
  });

  it("selects the supplies section for a supplies question", () => {
    const context = readHelpContext(ask("¿Dónde registro los insumos?"));

    expect(context).toContain("## Insumos y packaging (P08–P09)");
  });

  it("marks multiproduct break-even as a phase 2 proposal", () => {
    const context = readHelpContext(ask("¿Puedo calcular el equilibrio multiproducto?"));

    expect(context).toContain("## Punto de equilibrio");
    expect(context).toContain("fase 2");
  });

  it("returns the base document for a question without matches", () => {
    expect(readHelpContext(ask("¿Cuál es la capital de Francia?"))).toBe(readHelpCorpus());
  });

  it("warns on the server when an optional document is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.TEST_MISSING_DOC = "1";
    try {
      const context = readHelpContext(ask("¿Qué es el margen?"));

      expect(context).toBe(readHelpCorpus());
      expect(warn).toHaveBeenCalled();
      const message = warn.mock.calls.flat().join(" ");
      expect(message).toContain("glosario-ayuda.md");
      expect(message).not.toContain("margen");
    } finally {
      delete process.env.TEST_MISSING_DOC;
    }
  });

  it("keeps every topic rule pointed at a real section of the documents", () => {
    const headings = {
      glosario: splitHelpSections(readAyuda("glosario-ayuda.md")),
      navegacion: splitHelpSections(readAyuda("navegacion-ayuda.md")),
    };

    for (const rule of HELP_TOPIC_RULES) {
      expect(rule.keywords.length, `${rule.id} sin palabras clave`).toBeGreaterThan(0);

      for (const doc of ["glosario", "navegacion"] as const) {
        const keys = rule[doc] ?? [];
        if (keys.length > 0) {
          expect(keys.length, `${rule.id} sin secciones en ${doc}`).toBeGreaterThan(0);
        }

        for (const key of keys) {
          const normalizedKey = normalizeHelpText(key).trim();
          const found = headings[doc].some((section) => {
            const heading = normalizeHelpText(section.heading).trim();
            return heading === normalizedKey || heading.startsWith(`${normalizedKey} (`);
          });

          expect(found, `${rule.id} apunta a una sección inexistente en ${doc}: «${key}»`).toBe(
            true,
          );
        }
      }

      expect(
        (rule.glosario?.length ?? 0) + (rule.navegacion?.length ?? 0),
        `${rule.id} sin secciones`,
      ).toBeGreaterThan(0);
    }
  });
});
