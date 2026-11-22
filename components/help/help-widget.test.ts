import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HelpMessageItem, HelpWidget } from "./help-widget";

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

describe("HelpWidget", () => {
  it("renders nothing while the help is disabled", () => {
    expect(render(createElement(HelpWidget, { enabled: false, userId: "user-a" }))).toBe("");
  });

  it("renders the launcher button for a signed-in user", () => {
    const html = render(createElement(HelpWidget, { enabled: true, userId: "user-a" }));
    expect(html).toContain('aria-label="Abrir ayuda"');
    expect(html).toContain('aria-expanded="false"');
  });
});

describe("HelpMessageItem", () => {
  it("keeps user messages as plain text", () => {
    const html = render(
      createElement(HelpMessageItem, {
        message: { role: "user", content: "Hola, **qué es** el margen?" },
        streaming: false,
      }),
    );
    expect(html).toContain("Hola, **qué es** el margen?");
    expect(html).not.toContain("<strong>");
    expect(html).toContain("self-end");
  });

  it("renders assistant replies as Markdown", () => {
    const html = render(
      createElement(HelpMessageItem, {
        message: { role: "assistant", content: "El **margen** es la parte del precio." },
        streaming: false,
      }),
    );
    expect(html).toContain("<strong>margen</strong>");
    expect(html).not.toContain("**margen**");
    expect(html).toContain("self-start");
  });

  it("shows the streaming indicator while the answer is empty", () => {
    const html = render(
      createElement(HelpMessageItem, {
        message: { role: "assistant", content: "" },
        streaming: true,
      }),
    );
    expect(html).toContain("…");
  });

  it("renders an empty assistant bubble without indicator when idle", () => {
    const html = render(
      createElement(HelpMessageItem, {
        message: { role: "assistant", content: "" },
        streaming: false,
      }),
    );
    expect(html).not.toContain("…");
  });
});
