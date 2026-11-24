import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HelpMarkdown } from "./help-markdown";

function render(content: string): string {
  return renderToStaticMarkup(createElement(HelpMarkdown, { content }));
}

describe("HelpMarkdown", () => {
  it("renders paragraphs separated by a blank line", () => {
    const html = render("Primera línea.\n\nSegunda línea.");
    expect(html).toContain("Primera línea.");
    expect(html).toContain("Segunda línea.");
    expect(html.match(/<p/g)).toHaveLength(2);
  });

  it("renders bold and italic without raw markup", () => {
    const html = render("El **margen** es *clave* acá.");
    expect(html).toContain("<strong>margen</strong>");
    expect(html).toContain("<em>clave</em>");
    expect(html).not.toContain("**");
    expect(html).not.toContain("*clave*");
  });

  it("renders unordered and ordered lists", () => {
    const unordered = render("- uno\n- dos");
    expect(unordered).toContain("<ul");
expect(unordered).toContain(">uno</li>");
expect(unordered).toContain(">dos</li>");

    const ordered = render("1. primero\n2. segundo");
   expect(ordered).toContain("<ol");
expect(ordered).toContain(">primero</li>");
expect(ordered).toContain(">segundo</li>");
  });

  it("renders headings as chat-sized styled text, not h1-h6", () => {
    const html = render("# Título\n\n## Sección\n\n### Detalle");
    expect(html).not.toMatch(/<h[1-6]/);
    expect(html).toContain("font-semibold");
    expect(html).toContain("Título");
    expect(html).toContain("Sección");
    expect(html).toContain("Detalle");
  });

  it("keeps line breaks inside a paragraph", () => {
    const html = render("linea uno\nlinea dos");
    expect(html).toContain("whitespace-pre-line");
    expect(html).toContain("linea uno\nlinea dos");
  });

  it("renders inline code", () => {
    const html = render("El total es `1.234`.");
    expect(html).toContain("<code");
    expect(html).toContain("1.234");
  });

  it("escapes HTML from the model instead of executing it", () => {
    const html = render('<script>alert("x")</script> y <img src=x onerror=y>');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });

  it("keeps half-written Markdown readable while streaming", () => {
    const html = render("El **marg");
    expect(html).toContain("**marg");
    expect(html).not.toContain("<strong>");
  });

  it("renders nothing for empty content", () => {
    expect(render("")).toBe("");
  });
});
