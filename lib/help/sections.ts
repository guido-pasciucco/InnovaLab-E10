// Deterministic selection of sections from the curated help documents.
//
// Pure: no filesystem, no network and no model call, so the rules are unit
// tested on their own. `lib/help/corpus.ts` reads the files and passes them
// in. There is no embedding and no retrieval index here on purpose: the
// section set of each document is small and stable, so a keyword match keeps
// the prompt small without a parallel RAG stack.

// Total documentary context (base document plus selected sections) that one
// request may send. The base is never truncated; the budget only limits how
// many extra sections fit.
export const HELP_CONTEXT_MAX_CHARS = 16_000;

export type HelpSection = { heading: string; body: string };

export type HelpDocuments = { glosario: string; navegacion: string };

// One topic of the question, the words that raise it and the sections that
// answer it. Rules are listed in priority order: when the budget is tight the
// first rules keep their sections.
export type HelpTopicRule = {
  id: string;
  keywords: readonly string[];
  glosario?: readonly string[];
  navegacion?: readonly string[];
};

// Heading keys are written without the trailing "(P08–P09)" suffix and are
// matched after normalization, so a dash variant in the document cannot break
// a rule. `corpus.test.ts` fails when a key stops matching a real heading.
export const HELP_TOPIC_RULES: readonly HelpTopicRule[] = [
  {
    id: "precio-sugerido",
    keywords: [
      "precio",
      "a cuanto vender",
      "cuanto cobrar",
      "como se forma el precio",
    ],
    glosario: ["Precio sugerido"],
    navegacion: ["Precio sugerido"],
  },
  {
    id: "recargo",
    keywords: [
      "recargo",
      "markup",
      "sumar al costo",
      "sumarle al costo",
      "sobre el costo total",
    ],
    glosario: ["Recargo sobre el costo"],
    navegacion: ["Precio sugerido"],
  },
  {
    id: "margen",
    keywords: [
      "margen",
      "ganancia",
      "utilidad",
      "rentabilidad",
      "cuanto gano",
      "cuanto queda por unidad",
    ],
    glosario: ["Margen sobre el precio", "Margen en pesos"],
  },
  {
    id: "contribucion",
    keywords: ["contribucion", "aporta cada venta", "aporte por venta"],
    glosario: ["Contribución de una unidad"],
    navegacion: ["Contribución y equilibrio"],
  },
  {
    id: "punto-de-equilibrio",
    keywords: [
      "equilibrio",
      "break even",
      "cuanto vender para",
      "no perder plata",
      "cuanto tengo que vender",
    ],
    glosario: ["Punto de equilibrio"],
    navegacion: ["Contribución y equilibrio"],
  },
  {
    id: "equilibrio-multiproducto",
    keywords: [
      "equilibrio en pesos",
      "unidades de equilibrio",
      "cuota en unidades",
      "contribucion ponderada",
      "mezcla",
      "tablero multiproducto",
      "multiproducto",
      "multiproduct",
      "todo mi catalogo",
      "cuanto facturar",
      "facturacion por producto",
    ],
    glosario: [
      "Equilibrio en pesos",
      "Unidades de equilibrio de una mezcla",
      "Cuota en unidades por producto",
      "Contribución ponderada",
      "Mezcla de productos",
      "Facturación por producto vinculada al equilibrio",
    ],
    navegacion: ["Tablero global de resultados", "Contribución y equilibrio"],
  },
  {
    id: "costo-variable",
    keywords: [
      "costo variable",
      "variable unitario",
      "cvu",
      "materiales",
      "ingredientes",
    ],
    glosario: ["Costo variable", "Costo variable unitario"],
  },
  {
    id: "costo-total",
    keywords: [
      "costo total",
      "costo completo",
      "cuanto cuesta producir",
      "cuanto cuesta fabricar",
      "cuanto me cuesta una unidad",
      "cuanto cuesta",
      "cuanto me cuesta",
    ],
    glosario: ["Costo total unitario"],
  },
  {
    id: "gastos-estructura",
    keywords: [
      "gastos fijos",
      "costos fijos",
      "gasto fijo",
      "costo fijo",
      "indirecto",
      "estructura",
      "alquiler",
      "seguro",
      "sueldo",
      "trabajo propio",
    ],
    glosario: ["Gastos fijos, indirectos y de estructura"],
    navegacion: ["Gastos generales y distribución"],
  },
  {
    id: "gastos-del-periodo",
    keywords: [
      "gastos generales",
      "gastos indirectos",
      "costos indirectos",
      "distribucion",
      "prorrateo",
      "reparto",
      "gastos",
      "costos del negocio",
      "costos de mi",
      "donde cargo el alquiler",
    ],
    glosario: ["Gastos fijos, indirectos y de estructura"],
    navegacion: ["Gastos generales y distribución"],
  },
  {
    id: "capacidad-produccion",
    keywords: [
      "capacidad",
      "produccion planificada",
      "produccion mensual",
      "cuantas unidades pens",
      "agregar otro producto",
      "planea fabricar",
    ],
    glosario: ["Capacidad del mes / objetivo de producción"],
    navegacion: ["Producción mensual"],
  },
  {
    id: "insumos",
    keywords: [
      "insumo",
      "packaging",
      "harina",
      "envase",
      "materia prima",
    ],
    glosario: ["Costo variable"],
    navegacion: ["Insumos y packaging"],
  },
  {
    id: "productos-recetas",
    keywords: [
      "receta",
      "rendimiento",
      "ingrediente",
      "lote",
      "crear un producto",
      "nuevo producto",
    ],
    navegacion: ["Productos y recetas"],
  },
  {
    id: "presentaciones",
    keywords: [
      "presentacion",
      "caja de",
      "seis unidades",
      "empaque",
      "cuantas unidades contiene",
    ],
    glosario: ["Costo variable unitario"],
    navegacion: ["Presentaciones y costo variable"],
  },
  {
    id: "acceso-cuenta",
    keywords: [
      "iniciar sesion",
      "crear cuenta",
      "cuenta nueva",
      "registrarme",
      "registrarse",
      "contrasena",
      "clave",
      "correo",
      "verificacion",
      "recuperar",
      "olvide",
      "confirmar el correo",
    ],
    navegacion: ["Acceso a Numora"],
  },
  {
    id: "menu-navegacion",
    keywords: [
      "menu",
      "configuraciones",
      "datos historicos",
      "cerrar sesion",
      "bienvenida",
      "onboarding",
    ],
    navegacion: ["Inicio y menú de navegación"],
  },
  {
    id: "faq-navegacion",
    keywords: [
      "donde cargo",
      "donde veo",
      "donde encuentro",
      "donde puedo",
      "donde se carga",
      "como creo",
      "como llego",
      "en que pantalla",
      "que boton",
      "como hago para",
    ],
    navegacion: ["Reglas para responder preguntas de navegación"],
  },
  {
    id: "tablero-resultados",
    keywords: [
      "tablero",
      "tabla de resultados",
      "dashboard",
      "resultados del catalogo",
      "resultados",
      "resumen",
      "grafico",
      "cuota minima",
    ],
    glosario: ["Indicadores destacados del tablero diseñado"],
    navegacion: ["Tablero global de resultados"],
  },
  {
    id: "impuestos-y-cargas",
    keywords: [
      "impuesto",
      "percepcion",
      "retencion",
      "merma",
      "inflacion",
      "factura",
      "facturacion",
      "asesoramiento",
    ],
    glosario: ["Antes de interpretar el tablero"],
  },
];

// Lowercase without accents, so "sesión" matches the keyword "sesion".
export function normalizeHelpText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Splits a document into its `##` sections. The text before the first
// heading (titles, source notes and editorial remarks) is never part of a
// section, so it can never reach the prompt.
export function splitHelpSections(markdown: string): HelpSection[] {
  const sections: HelpSection[] = [];
  let heading = "";
  let lines: string[] = [];

  const flush = () => {
    if (!heading) return;
    const body = lines.join("\n").trim();
    if (body) sections.push({ heading, body });
  };

  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    // `###` subheadings stay inside their `##` section.
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      flush();
      heading = match[1].trim();
      lines = [];
      continue;
    }
    if (heading) lines.push(line);
  }
  flush();

  return sections;
}

// A rule fires when any of its keywords appears in the normalized question.
// Matching is a plain substring check on purpose: it covers the plural and the
// verb forms of Spanish without a stemmer.
export function matchHelpTopics(question: string): HelpTopicRule[] {
  const normalized = normalizeHelpText(question);
  if (!normalized.trim()) return [];

  return HELP_TOPIC_RULES.filter((rule) =>
    rule.keywords.some((keyword) => normalized.includes(normalizeHelpText(keyword))),
  );
}

type PickedSection = HelpSection & { doc: keyof HelpDocuments; rank: number };

// Base document plus the sections the question asks for, never longer than
// HELP_CONTEXT_MAX_CHARS. A question that matches nothing gets the base
// alone, which keeps the current safe behaviour.
export function buildHelpContext(
  base: string,
  question: string,
  documents: HelpDocuments,
): string {
  const room = HELP_CONTEXT_MAX_CHARS - base.length;
  if (room <= 0 || !question.trim()) return base;

  const sections = {
    glosario: splitHelpSections(documents.glosario),
    navegacion: splitHelpSections(documents.navegacion),
  };

  const picked: PickedSection[] = [];
  const seen = new Set<string>();
  let used = 0;

  for (const rule of matchHelpTopics(question)) {
    for (const doc of ["glosario", "navegacion"] as const) {
      for (const key of rule[doc] ?? []) {
        const section = sections[doc].find((item) => headingMatches(item.heading, key));
        if (!section) continue;

        const token = `${doc}:${normalizeHelpText(section.heading)}`;
        if (seen.has(token)) continue;
        seen.add(token);

        const block = blockOf(section);
        if (used + block.length > room) continue;
        used += block.length;
        picked.push({ ...section, doc, rank: picked.length });
      }
    }
  }

  // Priority decides what fits; the document order decides how it reads.
  const ordered = picked.sort((left, right) => {
    if (left.doc !== right.doc) return left.doc === "glosario" ? -1 : 1;
    return left.rank - right.rank;
  });

  if (ordered.length === 0) return base;

  return [base.trimEnd(), ...ordered.map(blockOf)].join("\n\n");
}

// The last user message of the request body, taken defensively: the route
// still validates the body with the schema, so an invalid shape only means
// "no question", never a crash before validation.
export function lastUserQuestion(raw: unknown): string {
  if (typeof raw !== "object" || raw === null) return "";

  const messages = (raw as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return "";

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as { role?: unknown; content?: unknown } | null;
    if (
      message &&
      typeof message === "object" &&
      message.role === "user" &&
      typeof message.content === "string"
    ) {
      return message.content;
    }
  }

  return "";
}

function blockOf(section: HelpSection): string {
  return `## ${section.heading}\n\n${section.body}`;
}

// Exact heading match, or the heading with its "(P08–P09)" suffix.
function headingMatches(heading: string, key: string): boolean {
  const normalizedHeading = normalizeHelpText(heading).trim();
  const normalizedKey = normalizeHelpText(key).trim();

  return (
    normalizedHeading === normalizedKey ||
    normalizedHeading.startsWith(`${normalizedKey} (`)
  );
}
