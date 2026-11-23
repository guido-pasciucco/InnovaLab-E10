import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HelpMessageItem, HelpWidget, MoraWelcome, SUGGESTED_QUESTIONS } from "./help-widget";

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

describe("HelpWidget", () => {
  it("renders nothing while the help is disabled", () => {
    expect(render(createElement(HelpWidget, { enabled: false, userId: "user-a" }))).toBe("");
  });

  it("renders the launcher button for a signed-in user", () => {
    const html = render(createElement(HelpWidget, { enabled: true, userId: "user-a" }));
    expect(html).toContain('aria-label="Abrir ayuda de Mora"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("mora-avatar.png");
    expect(html).toContain('alt=""');
  });
});

describe("MoraWelcome", () => {
  it("shows Mora's introduction and three actionable suggestions", () => {
    const html = render(createElement(MoraWelcome, { onSelect: () => {} }));
    expect(html).toContain("¡Hola! Soy Mora.");
    expect(html).toContain("Te ayudo a entender tus costos");
    expect(SUGGESTED_QUESTIONS).toHaveLength(3);
    for (const question of SUGGESTED_QUESTIONS) {
      expect(html).toContain(question);
    }
    expect(html.match(/type="button"/g)).toHaveLength(3);
  });

  it("disables suggested questions while waiting for a response", () => {
    const html = render(createElement(MoraWelcome, { onSelect: () => {}, disabled: true }));
    expect(html.match(/disabled=""/g)).toHaveLength(3);
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
    expect(html).toContain("justify-end");
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
    expect(html).toContain("justify-start");
  });

  it("shows the streaming indicator while the answer is empty", () => {
    const html = render(
      createElement(HelpMessageItem, {
        message: { role: "assistant", content: "" },
        streaming: true,
      }),
    );
    expect(html).toContain("...");
  });

  it("renders an empty assistant bubble without indicator when idle", () => {
    const html = render(
      createElement(HelpMessageItem, {
        message: { role: "assistant", content: "" },
        streaming: false,
      }),
    );
    expect(html).not.toContain("...");
  });
});
