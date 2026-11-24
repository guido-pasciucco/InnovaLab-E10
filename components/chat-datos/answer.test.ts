import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Answer } from "./answer";
import { EMPTY_ANSWER_TEXT, type AnswerView, type QueryView } from "./messages";

const QUERY: QueryView = {
  columns: ["name", "price"],
  rows: [
    { name: "Harina", price: "1234.50" },
    { name: "Azúcar", price: "800.00" },
  ],
  truncated: false,
};

function render(view: Partial<AnswerView>, finished = true): string {
  const full: AnswerView = { text: "", sources: [], queries: [], working: false, ...view };
  return renderToStaticMarkup(createElement(Answer, { view: full, finished }));
}

describe("Answer", () => {
  it("shows the text as paragraphs", () => {
    const html = render({ text: "Primera parte.\n\nSegunda parte." });

    expect(html.match(/<p /g)).toHaveLength(2);
    expect(html).toContain("Primera parte.");
    expect(html).toContain("Segunda parte.");
  });

  it("escapes what the model wrote instead of drawing it as HTML", () => {
    const html = render({ text: "<img src=x onerror=alert(1)>" });

    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("shows a fallback when the stream ended with no text and no data", () => {
    expect(render({}, true)).toContain(EMPTY_ANSWER_TEXT);
  });

  it("does not show the fallback while the answer is still coming", () => {
    expect(render({}, false)).not.toContain(EMPTY_ANSWER_TEXT);
  });

  it("does not show the fallback when there is data even without text", () => {
    expect(render({ queries: [QUERY] }, true)).not.toContain(EMPTY_ANSWER_TEXT);
  });

  it("says it is querying only while a tool runs and the answer is not over", () => {
    expect(render({ working: true }, false)).toContain("Consultando tus datos");
    expect(render({ working: true }, true)).not.toContain("Consultando tus datos");
    expect(render({ working: false }, false)).not.toContain("Consultando tus datos");
  });

  it("offers the rows of a query in a table, formatted", () => {
    const html = render({ text: "Listo.", queries: [QUERY] });

    expect(html).toContain("Ver los datos");
    expect(html).toContain("<table");
    expect(html).toContain("Harina");
    // Numeric text from the database stays as it came in a plain data table.
    expect(html).toContain("1234.50");
  });

  it("notes when the result was cut", () => {
    const html = render({ queries: [{ ...QUERY, truncated: true }] });

    expect(html).toContain("Hay más filas");
  });

  it("shows the SQL only when the server sent it", () => {
    expect(render({ queries: [QUERY] })).not.toContain("SQL");
    expect(render({ queries: [{ ...QUERY, sql: "select name from analyst.supplies" }] })).toContain(
      "select name from analyst.supplies",
    );
  });

  it("draws a table chart with its title and money formatted", () => {
    const html = render({
      queries: [
        {
          ...QUERY,
          chart: {
            type: "table",
            title: "Insumos más caros",
            format: "currency",
            columns: ["name", "price"],
            data: [
              { name: "Harina", price: "1234.50" },
              { name: "Azúcar", price: "800.00" },
            ],
          },
        },
      ],
    });

    expect(html).toContain("Insumos más caros");
    expect(html).toContain("$ 1.234,50");
    // The table chart is the data: no second "Ver los datos" copy under it.
    expect(html).not.toContain("Ver los datos");
  });

  it("labels a bar chart for screen readers and keeps the data table", () => {
    const html = render({
      queries: [
        {
          ...QUERY,
          chart: {
            type: "bar",
            title: "Precio por insumo",
            format: "currency",
            x: "name",
            y: ["price"],
            data: [
              { name: "Harina", price: 1234.5 },
              { name: "Azúcar", price: 800 },
            ],
          },
        },
      ],
    });

    expect(html).toContain('aria-label="Gráfico: Precio por insumo"');
    expect(html).toContain("Ver los datos");
  });

  it("lists the documents the answer relied on", () => {
    const html = render({
      text: "Se calcula así.",
      sources: [
        { source: "docs/a.md", heading: "Punto de equilibrio" },
        { source: "docs/b.md", heading: "Margen" },
      ],
    });

    expect(html).toContain("Fuentes: Punto de equilibrio · Margen");
    // The path of the file is internal: only the heading shows.
    expect(html).not.toContain("docs/a.md");
  });
});
